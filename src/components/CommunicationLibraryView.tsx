import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  BookOpen, 
  Send, 
  FileText, 
  Upload, 
  CheckCheck, 
  User, 
  Download, 
  Plus, 
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Mail,
  MailOpen,
  Bell,
  QrCode,
  Clock
} from 'lucide-react';
import {
  Mensagem,
  DocumentoBiblioteca,
  Funcionario,
  Escola,
  Aluno,
  Turma,
  RegistoAcessoBiblioteca,
  TipoAcessoBiblioteca
} from '../types';
import { dbService } from '../services/storage';
import { QrScannerModal } from './QrScannerModal';

interface CommunicationLibraryViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
  alunos?: Aluno[];
  turmas?: Turma[];
  mensagens: Mensagem[];
  livros: DocumentoBiblioteca[];
  onEnviarMensagem: (msg: Mensagem) => void;
  onAdicionarLivro: (livro: DocumentoBiblioteca) => void;
  onMarcarComoLida?: (id: string) => void;
  onMarcarTodasComoLidas?: () => void;
}

export const CommunicationLibraryView: React.FC<CommunicationLibraryViewProps> = ({
  escola,
  currentUser,
  funcionarios,
  alunos = [],
  turmas = [],
  mensagens,
  livros,
  onEnviarMensagem,
  onAdicionarLivro,
  onMarcarComoLida,
  onMarcarTodasComoLidas
}) => {
  const [activeTab, setActiveTab] = useState<'comunicados' | 'mensagens_diretas' | 'biblioteca'>('comunicados');
  const [filtroMensagens, setFiltroMensagens] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');
  const [showQrScannerBiblioteca, setShowQrScannerBiblioteca] = useState(false);
  const [tipoAcessoQr, setTipoAcessoQr] = useState<TipoAcessoBiblioteca>('Entrada_Biblioteca');
  const [livroSelecionadoQrId, setLivroSelecionadoQrId] = useState('');
  const [acessosBiblioteca, setAcessosBiblioteca] = useState<RegistoAcessoBiblioteca[]>(() =>
    dbService.getAcessosBiblioteca(escola.id)
  );
  const [feedbackQrBiblioteca, setFeedbackQrBiblioteca] = useState<string | null>(null);

  useEffect(() => {
    setAcessosBiblioteca(dbService.getAcessosBiblioteca(escola.id));
    const refreshAcessos = () => {
      setAcessosBiblioteca(dbService.getAcessosBiblioteca(escola.id));
    };
    window.addEventListener('sge_dados_atualizados_remoto', refreshAcessos);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', refreshAcessos);
  }, [escola.id]);

  const handleRegistarAcessoQrBiblioteca = (aluno: Aluno) => {
    const turma = turmas.find(t => t.id === aluno.turmaId);
    const livro = livros.find(l => l.id === livroSelecionadoQrId);
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const codigoMat = aluno.codigoMatricula || aluno.numeroProcesso || '';
    const novoRegisto: RegistoAcessoBiblioteca = {
      id: `bib-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      escolaId: escola.id,
      alunoId: aluno.id,
      alunoNome: aluno.nomeCompleto,
      codigoMatricula: codigoMat,
      alunoCodigo: codigoMat,
      turmaNome: turma ? `${turma.classe} • ${turma.nome}` : aluno.classeId || 'Turma',
      tipoAcesso: tipoAcessoQr,
      livroId: livro?.id,
      livroTitulo: livro?.titulo,
      dataHora: agoraIso,
      dataDia: agoraIso.slice(0, 10),
      operadorId: currentUser.id,
      operadorNome: currentUser.nomeCompleto,
      registadoPorId: currentUser.id,
      registadoPorNome: currentUser.nomeCompleto
    };

    dbService.registarAcessoBiblioteca(novoRegisto);
    setAcessosBiblioteca(dbService.getAcessosBiblioteca(escola.id));
    setFeedbackQrBiblioteca(
      `Acesso à biblioteca (${tipoAcessoQr.replace(/_/g, ' ')}) registado para ${aluno.nomeCompleto}${livro ? ` — ${livro.titulo}` : ''}.`
    );
  };

  const isAdminGeral = currentUser.role === 'AdminGeral';
  const mensagensVisiveis = isAdminGeral
    ? mensagens
    : mensagens.filter(m =>
        m.remetentePapel !== 'AdminGeral' &&
        m.destinatarioId !== 'admin-geral' &&
        !(m.remetenteCargo || '').toLowerCase().includes('administrador geral') &&
        !((m.remetenteId || '').toLowerCase().includes('admin-geral'))
      );

  const totalNaoLidas = mensagensVisiveis.filter(m => !m.lida).length;
  const totalLidas = mensagensVisiveis.filter(m => !!m.lida).length;

  // Separação oficial: Comunicados vs Mensagens Diretas
  const comunicadosLista = mensagensVisiveis.filter(m => 
    m.tipo === 'GERAL' || 
    m.tipo === 'GRUPO' || 
    m.destinatarioTipo === 'Todos' || 
    m.destinatarioTipo === 'Docentes' || 
    m.destinatarioTipo === 'Secretaria'
  );

  const mensagensDiretasLista = mensagensVisiveis.filter(m => 
    m.tipo === 'DIRECTA' || 
    m.destinatarioTipo === 'Individual' || 
    m.destinatarioId === currentUser.id || 
    m.remetenteId === currentUser.id ||
    (isAdminGeral && m.destinatarioId === 'admin-geral')
  );

  const itensExibidos = (activeTab === 'comunicados' ? comunicadosLista : mensagensDiretasLista).filter(m => {
    if (filtroMensagens === 'nao_lidas') return !m.lida;
    if (filtroMensagens === 'lidas') return !!m.lida;
    return true;
  });

  // Estado envio de mensagem / comunicado
  const [tipoDestino, setTipoDestino] = useState<'Todos' | 'Docentes' | 'Secretaria' | 'Individual'>('Todos');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [assunto, setAssunto] = useState('');
  const [conteudo, setConteudo] = useState('');

  // Estado upload de livro
  const [showNovoLivroModal, setShowNovoLivroModal] = useState(false);
  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutor, setLivroAutor] = useState('');
  const [livroCategoria, setLivroCategoria] = useState<'Manual MED' | 'Literatura' | 'Regulamento'>('Manual MED');
  const [livroClasse, setLivroClasse] = useState('6ª');
  const [livroUrl, setLivroUrl] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assunto || !conteudo) return;

    const isDirecta = activeTab === 'mensagens_diretas' || tipoDestino === 'Individual';
    const destTipoFinal = isDirecta ? 'Individual' : tipoDestino;
    const destIdFinal = isDirecta ? destinatarioId : undefined;

    const novaMsg: Mensagem = {
      id: `msg-${Date.now()}`,
      escolaId: escola.id,
      remetenteId: currentUser.id,
      remetenteNome: currentUser.nomeCompleto,
      remetentePapel: currentUser.cargo || currentUser.role,
      remetenteCargo: currentUser.cargo || currentUser.role,
      tipo: isDirecta ? 'DIRECTA' : (tipoDestino === 'Todos' ? 'GERAL' : 'GRUPO'),
      destinatarioTipo: destTipoFinal,
      destinatarioId: destIdFinal,
      titulo: assunto,
      assunto,
      conteudo,
      lida: false,
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
      criadaEm: new Date().toISOString()
    };

    onEnviarMensagem(novaMsg);
    setAssunto('');
    setConteudo('');
  };

  const handleSalvarLivro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livroTitulo) return;

    const novo: DocumentoBiblioteca = {
      id: `doc-${Date.now()}`,
      escolaId: escola.id,
      titulo: livroTitulo,
      autor: livroAutor || 'Ministério da Educação de Angola',
      categoria: livroCategoria,
      classe: livroClasse,
      tamanhoBytes: 3.5 * 1024 * 1024,
      tamanhoMb: 3.5,
      url: livroUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      arquivoUrl: livroUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      dataUpload: new Date().toISOString().split('T')[0],
      carregadoEm: new Date().toISOString().split('T')[0],
      uploadPorNome: currentUser.nomeCompleto
    };

    onAdicionarLivro(novo);
    setShowNovoLivroModal(false);
    setLivroTitulo('');
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher com Separação Oficial */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('comunicados')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors border-2 flex items-center space-x-2 ${
            activeTab === 'comunicados'
              ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          <Bell className="w-4 h-4 text-blue-600" />
          <span>Comunicados Oficiais & Circulares ({comunicadosLista.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mensagens_diretas')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors border-2 flex items-center space-x-2 ${
            activeTab === 'mensagens_diretas'
              ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Mensagens Diretas & Direção ({mensagensDiretasLista.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('biblioteca')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors border-2 flex items-center space-x-2 ${
            activeTab === 'biblioteca'
              ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-2xs'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>Biblioteca Digital & Manuais MED ({livros.length})</span>
        </button>
      </div>

      {/* 1. COMUNICADOS OFICIAIS OU MENSAGENS DIRETAS */}
      {(activeTab === 'comunicados' || activeTab === 'mensagens_diretas') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Caixa de Entrada */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2">
                  {activeTab === 'comunicados' ? (
                    <Bell className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Mail className="w-4 h-4 text-emerald-600" />
                  )}
                  <h3 className="font-bold text-gray-900 text-sm">
                    {activeTab === 'comunicados'
                      ? 'Circulares & Despachos Oficiais'
                      : (isAdminGeral ? 'Conversas Diretas & Linha com Admin Geral' : 'Conversas Diretas & Direção')}
                  </h3>
                </div>

                {/* Botão Marcar Todas como Lidas */}
                {totalNaoLidas > 0 && onMarcarTodasComoLidas && (
                  <button
                    type="button"
                    onClick={onMarcarTodasComoLidas}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Marcar todas como lidas</span>
                  </button>
                )}
              </div>

              {/* Filtro de Abas: Todas, Não Lidas, Lidas */}
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroMensagens('todas')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filtroMensagens === 'todas'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Todas ({activeTab === 'comunicados' ? comunicadosLista.length : mensagensDiretasLista.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroMensagens('nao_lidas')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filtroMensagens === 'nao_lidas'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-amber-500" />
                  <span>Não Lidas ({itensExibidos.filter(m => !m.lida).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroMensagens('lidas')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filtroMensagens === 'lidas'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <MailOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lidas</span>
                </button>
              </div>

              {/* Lista de Mensagens / Comunicados */}
              <div className="space-y-3">
                {itensExibidos.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-xs">
                    {activeTab === 'comunicados' 
                      ? 'Nenhum comunicado oficial ativo no momento.' 
                      : (isAdminGeral
                        ? 'Nenhuma mensagem direta trocada com utilizadores ou com a Administração Geral.'
                        : 'Nenhuma mensagem direta trocada.')}
                  </div>
                ) : (
                  itensExibidos.map((msg) => {
                    const naoLida = !msg.lida;

                    return (
                      <div 
                        key={msg.id} 
                        className={`rounded-xl p-4 shadow-2xs space-y-2 transition-all border ${
                          naoLida 
                            ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                msg.destinatarioId === 'admin-geral' || msg.remetentePapel === 'AdminGeral'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300 font-black'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {msg.destinatarioId === 'admin-geral' 
                                  ? 'Para: Administrador Geral' 
                                  : (msg.destinatarioTipo === 'Todos' ? 'Geral para Todos' : msg.destinatarioTipo)}
                              </span>

                              {naoLida ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs flex items-center space-x-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>Novo • Não Lido</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  Visualizado
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm mt-1">{msg.assunto}</h4>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(msg.criadaEm || msg.dataHora || Date.now()).toLocaleDateString('pt-AO')}
                            </span>

                            {naoLida && onMarcarComoLida && (
                              <button
                                type="button"
                                onClick={() => onMarcarComoLida(msg.id)}
                                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                title="Marcar este item como lido"
                              >
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                                <span>Marcar como lida</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="font-medium text-gray-700">Por: {msg.remetenteNome} ({msg.remetenteCargo})</span>
                          <span className="flex items-center text-green-700 font-medium">
                            <CheckCheck className="h-3.5 w-3.5 mr-1 text-green-600" />
                            Entregue
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          {/* Formulário Novo Comunicado ou Mensagem Direta */}
          <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-xs space-y-4 h-fit">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">
                {activeTab === 'comunicados' ? 'Emitir Novo Comunicado Oficial' : 'Enviar Mensagem Direta'}
              </h3>
            </div>

            <form onSubmit={handleSend} className="space-y-3 text-xs">
              {activeTab === 'comunicados' ? (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Destinatários do Comunicado</label>
                  <select
                    value={tipoDestino}
                    onChange={(e) => setTipoDestino(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Todos">Toda a Comunidade Escolar</option>
                    <option value="Docentes">Apenas Corpo Docente</option>
                    <option value="Secretaria">Secretaria & Administração</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Destinatário</label>
                  <select
                    value={destinatarioId}
                    onChange={(e) => setDestinatarioId(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="">Selecione o destinatário...</option>
                    {funcionarios
                      .filter(f =>
                        f.id !== currentUser.id &&
                        f.role !== 'AdminGeral' &&
                        (isAdminGeral || f.escolaId === escola.id)
                      )
                      .map((f, fIdx) => (
                        <option key={`${f.id}-${f.escolaId || ''}-${fIdx}`} value={f.id}>
                          {f.nomeCompleto} ({f.cargo || f.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Assunto</label>
                <input
                  type="text"
                  required
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder={activeTab === 'comunicados' ? "Ex: Reunião Pedagógica Trimestral" : "Ex: Solicitação de suporte / Dúvida operacional"}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Conteúdo</label>
                <textarea
                  required
                  rows={4}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder={activeTab === 'comunicados' ? "Digite os termos do comunicado oficial..." : "Digite a mensagem direta..."}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Send className="h-4 w-4" />
                <span>{activeTab === 'comunicados' ? 'Publicar Comunicado' : 'Enviar Mensagem Direta'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. BIBLIOTECA DIGITAL */}
      {activeTab === 'biblioteca' && (
        <div className="space-y-6">
          {/* Controlo de Acesso & Empréstimos via QR Code do Passe */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Controlo Digital da Biblioteca • Leitura de Passe Estudantil</span>
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  Registar Acesso ou Empréstimo por QR Code
                </h3>
                <p className="text-xs text-slate-300">
                  Leia o código QR do cartão do estudante para autorizar a entrada, consulta de acervo ou empréstimo/devolução de manuais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQrScannerBiblioteca(true)}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shrink-0 shadow-xs"
              >
                <QrCode className="h-4 w-4" />
                <span>Ler Passe Estudantil (QR)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Tipo de Registo</label>
                <select
                  value={tipoAcessoQr}
                  onChange={(e) => setTipoAcessoQr(e.target.value as TipoAcessoBiblioteca)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="Entrada_Biblioteca">Entrada / Presença na Biblioteca</option>
                  <option value="Consulta_Local">Consulta Local de Material</option>
                  <option value="Emprestimo_Livro">Empréstimo de Manual / Livro</option>
                  <option value="Devolucao_Livro">Devolução de Manual / Livro</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Manual / Livro (Opcional)</label>
                <select
                  value={livroSelecionadoQrId}
                  onChange={(e) => setLivroSelecionadoQrId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="">Acesso geral sem livro específico</option>
                  {livros.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titulo} ({l.classe})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {feedbackQrBiblioteca && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/50 rounded-xl text-xs text-emerald-100 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span>{feedbackQrBiblioteca}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackQrBiblioteca(null)}
                  className="font-bold text-emerald-200 hover:underline cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900">Biblioteca Digital & Manuais Escolares do MED</h3>
              <p className="text-xs text-gray-500">Repositório de manuais didáticos, programas curriculares e regulamentos</p>
            </div>

            <button
              onClick={() => setShowNovoLivroModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Ficheiro PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {livros.map((livro) => (
              <div key={livro.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                      {livro.categoria}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">{livro.classe}</span>
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm mt-2 leading-snug">{livro.titulo}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{livro.autor}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px]">{livro.tamanhoMb} MB • PDF</span>
                  <a
                    href={livro.arquivoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-700 hover:text-blue-900 inline-flex items-center space-x-1"
                  >
                    <span>Ler PDF</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Histórico de Acessos e Empréstimos via QR Code */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-black text-gray-900">
                  Registo em Tempo Real de Acessos & Empréstimos ({acessosBiblioteca.length})
                </h4>
              </div>
              <span className="text-[11px] text-gray-500 font-semibold">Sincronizado na nuvem Firebase</span>
            </div>

            {acessosBiblioteca.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500">
                Ainda não foram registados acessos ou empréstimos via QR Code nesta instituição.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-black text-gray-600">
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Estudante</th>
                      <th className="p-2.5">Turma</th>
                      <th className="p-2.5">Operação</th>
                      <th className="p-2.5">Obra / Manual</th>
                      <th className="p-2.5">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {acessosBiblioteca.slice(0, 30).map((acc) => (
                      <tr key={acc.id} className="hover:bg-blue-50/40">
                        <td className="p-2.5 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          {new Date(acc.dataHora).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-2.5 font-bold text-gray-900">
                          {acc.alunoNome}
                          <span className="block text-[10px] font-mono font-normal text-gray-500">{acc.alunoCodigo}</span>
                        </td>
                        <td className="p-2.5 text-gray-700 font-medium">{acc.turmaNome || '—'}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acc.tipoAcesso === 'Emprestimo_Livro'
                              ? 'bg-amber-100 text-amber-900'
                              : acc.tipoAcesso === 'Devolucao_Livro'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-blue-100 text-blue-900'
                          }`}>
                            {acc.tipoAcesso.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-700">{acc.livroTitulo || 'Consulta Geral'}</td>
                        <td className="p-2.5 text-gray-500 text-[11px]">{acc.registadoPorNome || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <QrScannerModal
        isOpen={showQrScannerBiblioteca}
        onClose={() => setShowQrScannerBiblioteca(false)}
        titulo="Leitor QR — Acesso à Biblioteca Escolar"
        subtitulo="Valide o cartão de estudante para registar entrada, consulta local ou empréstimo."
        acaoRotulo={`Registar ${tipoAcessoQr.replace(/_/g, ' ')}`}
        alunos={alunos.length > 0 ? alunos : dbService.getAlunos().filter(a => !a.escolaId || a.escolaId === escola.id)}
        turmas={turmas.length > 0 ? turmas : dbService.getTurmas().filter(t => !t.escolaId || t.escolaId === escola.id)}
        onStudentMatched={handleRegistarAcessoQrBiblioteca}
      />

      {/* Modal Novo Livro */}
      {showNovoLivroModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border-2 border-green-600 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Cadastrar Documento na Biblioteca</h3>
            <form onSubmit={handleSalvarLivro} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título do Documento</label>
                <input
                  type="text"
                  required
                  value={livroTitulo}
                  onChange={(e) => setLivroTitulo(e.target.value)}
                  placeholder="Ex: Manual de Língua Portuguesa - 6ª Classe"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Autor / Editora</label>
                <input
                  type="text"
                  value={livroAutor}
                  onChange={(e) => setLivroAutor(e.target.value)}
                  placeholder="Ex: Ministério da Educação (MED)"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Categoria</label>
                  <select
                    value={livroCategoria}
                    onChange={(e) => setLivroCategoria(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:outline-none"
                  >
                    <option value="Manual MED">Manual MED</option>
                    <option value="Literatura">Literatura</option>
                    <option value="Regulamento">Regulamento</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Classe / Nível</label>
                  <input
                    type="text"
                    value={livroClasse}
                    onChange={(e) => setLivroClasse(e.target.value)}
                    placeholder="Ex: 6ª Classe"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovoLivroModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded"
                >
                  Salvar na Biblioteca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
