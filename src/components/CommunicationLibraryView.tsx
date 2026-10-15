import React, { useState } from 'react';
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
  Bell
} from 'lucide-react';
import { Mensagem, DocumentoBiblioteca, Funcionario, Escola } from '../types';

interface CommunicationLibraryViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
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
  mensagens,
  livros,
  onEnviarMensagem,
  onAdicionarLivro,
  onMarcarComoLida,
  onMarcarTodasComoLidas
}) => {
  const [activeTab, setActiveTab] = useState<'mensagens' | 'biblioteca'>('mensagens');
  const [filtroMensagens, setFiltroMensagens] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');

  const totalNaoLidas = mensagens.filter(m => !m.lida).length;
  const totalLidas = mensagens.filter(m => !!m.lida).length;
  const mensagensExibidas = mensagens.filter(m => {
    if (filtroMensagens === 'nao_lidas') return !m.lida;
    if (filtroMensagens === 'lidas') return !!m.lida;
    return true;
  });

  // Estado envio de mensagem
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

    const novaMsg: Mensagem = {
      id: `msg-${Date.now()}`,
      escolaId: escola.id,
      remetenteId: currentUser.id,
      remetenteNome: currentUser.nomeCompleto,
      remetentePapel: currentUser.cargo,
      remetenteCargo: currentUser.cargo,
      tipo: tipoDestino === 'Todos' ? 'GERAL' : (tipoDestino === 'Individual' ? 'DIRECTA' : 'GRUPO'),
      destinatarioTipo: tipoDestino,
      destinatarioId: tipoDestino === 'Individual' ? destinatarioId : undefined,
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
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('mensagens')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 ${
            activeTab === 'mensagens'
              ? 'bg-blue-50 text-blue-700 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          Mensagens & Comunicados Escolares
        </button>

        <button
          onClick={() => setActiveTab('biblioteca')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors border-2 ${
            activeTab === 'biblioteca'
              ? 'bg-blue-50 text-blue-700 border-blue-600'
              : 'text-gray-700 hover:bg-gray-100 border-transparent'
          }`}
        >
          Biblioteca Digital & Manuais MED
        </button>
      </div>

      {/* 1. MENSAGENS */}
      {activeTab === 'mensagens' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Caixa de Entrada / Comunicados */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Comunicados & Notificações Ativas</h3>
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
                  <span>Todas ({mensagens.length})</span>
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
                  <span>Não Lidas ({totalNaoLidas})</span>
                  {totalNaoLidas > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  )}
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
                  <span>Lidas ({totalLidas})</span>
                </button>
              </div>

              {/* Lista de Mensagens */}
              <div className="space-y-3">
                {mensagensExibidas.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-xs">
                    {filtroMensagens === 'nao_lidas'
                      ? 'Parabéns! Todas as notificações e comunicados já foram visualizados.'
                      : 'Nenhuma mensagem encontrada nesta pasta.'}
                  </div>
                ) : (
                  mensagensExibidas.map((msg) => {
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
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                {msg.destinatarioTipo === 'Todos' ? 'Geral para Todos' : msg.destinatarioTipo}
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
                                title="Marcar este comunicado como lido"
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

          {/* Formulário Novo Comunicado */}
          <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-xs space-y-4 h-fit">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Emitir Novo Comunicado</h3>
            </div>

            <form onSubmit={handleSend} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Destinatários</label>
                <select
                  value={tipoDestino}
                  onChange={(e) => setTipoDestino(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Todos">Toda a Comunidade Escolar</option>
                  <option value="Docentes">Apenas Corpo Docente</option>
                  <option value="Secretaria">Secretaria & Administração</option>
                  <option value="Individual">Utilizador Individual</option>
                </select>
              </div>

              {tipoDestino === 'Individual' && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Destinatário Específico</label>
                  <select
                    value={destinatarioId}
                    onChange={(e) => setDestinatarioId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">Selecione o funcionário...</option>
                    {funcionarios.map((f, fIdx) => (
                      <option key={`${f.id}-${f.escolaId || ''}-${fIdx}`} value={f.id}>{f.nomeCompleto} ({f.cargo})</option>
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
                  placeholder="Ex: Reunião Pedagógica Trimestral"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Conteúdo da Mensagem</label>
                <textarea
                  required
                  rows={4}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Digite o comunicado oficial..."
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center space-x-1.5"
              >
                <Send className="h-4 w-4" />
                <span>Publicar Comunicado</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. BIBLIOTECA DIGITAL */}
      {activeTab === 'biblioteca' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900">Biblioteca Digital & Manuais Escolares do MED</h3>
              <p className="text-xs text-gray-500">Repositório de manuais didáticos, programas curriculares e regulamentos</p>
            </div>

            <button
              onClick={() => setShowNovoLivroModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors inline-flex items-center space-x-1.5"
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
        </div>
      )}

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
