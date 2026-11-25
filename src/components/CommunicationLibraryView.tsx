import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  AlertTriangle,
  Eye,
  Trash2,
  Search,
  X,
  Loader2,
  HardDrive
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
import { offlineStorage } from '../services/offlineStorage';
import { firebaseSyncEngine } from '../services/firebaseSyncEngine';
import { TODAS_CLASSES_OFICIAIS_MED } from '../services/academicHierarchyService';
import { QrScannerModal } from './QrScannerModal';
import { antiSpamService } from '../services/antiSpamService';

interface CommunicationLibraryViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
  alunos?: Aluno[];
  turmas?: Turma[];
  mensagens: Mensagem[];
  livros: DocumentoBiblioteca[];
  initialSubTab?: 'comunicados' | 'mensagens_diretas' | 'biblioteca';
  onEnviarMensagem: (msg: Mensagem) => void;
  onAdicionarLivro: (livro: DocumentoBiblioteca) => void;
  onExcluirLivro?: (livroId: string) => void;
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
  initialSubTab,
  onEnviarMensagem,
  onAdicionarLivro,
  onExcluirLivro,
  onMarcarComoLida,
  onMarcarTodasComoLidas
}) => {
  const [activeTab, setActiveTab] = useState<'comunicados' | 'mensagens_diretas' | 'biblioteca'>(initialSubTab || 'comunicados');
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [filtroMensagens, setFiltroMensagens] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');
  const [showQrScannerBiblioteca, setShowQrScannerBiblioteca] = useState(false);
  const [tipoAcessoQr, setTipoAcessoQr] = useState<TipoAcessoBiblioteca>('Entrada_Biblioteca');
  const [livroSelecionadoQrId, setLivroSelecionadoQrId] = useState('');
  const [acessosBiblioteca, setAcessosBiblioteca] = useState<RegistoAcessoBiblioteca[]>(() =>
    dbService.getAcessosBiblioteca(escola.id)
  );
  const [feedbackQrBiblioteca, setFeedbackQrBiblioteca] = useState<string | null>(null);
  const [showUrgenteBibModal, setShowUrgenteBibModal] = useState(false);
  const [bibUrgenteDestino, setBibUrgenteDestino] = useState<'Todos' | 'Docentes' | 'Secretaria'>('Todos');
  const [bibUrgenteAssunto, setBibUrgenteAssunto] = useState('');
  const [bibUrgenteConteudo, setBibUrgenteConteudo] = useState('');

  useEffect(() => {
    setAcessosBiblioteca(dbService.getAcessosBiblioteca(escola.id));
    const refreshAcessos = () => {
      setAcessosBiblioteca(dbService.getAcessosBiblioteca(escola.id));
    };
    const handleOpenSubTab = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === 'comunicados' || tab === 'mensagens_diretas' || tab === 'biblioteca') {
        setActiveTab(tab);
      }
    };
    window.addEventListener('sge_dados_atualizados_remoto', refreshAcessos);
    window.addEventListener('sge_open_comm_subtab', handleOpenSubTab);
    return () => {
      window.removeEventListener('sge_dados_atualizados_remoto', refreshAcessos);
      window.removeEventListener('sge_open_comm_subtab', handleOpenSubTab);
    };
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

  const roleNorm = (currentUser.role || '').toLowerCase();
  const ehDirecaoOuAdmin = isAdminGeral || [
    'diretorgeral',
    'subdiretorpedagogico',
    'subdiretoradministrativo',
    'subdirectoradministrativo'
  ].includes(roleNorm);
  const ehSecretariaOuFin = [
    'secretaria',
    'chefesecretaria',
    'secretario',
    'secretarioescolar',
    'tesoureiro'
  ].includes(roleNorm);
  const ehCoordenador = [
    'coordenadorpedagogico',
    'coordenadorturno',
    'coordenadordisciplina'
  ].includes(roleNorm);
  const ehDocente = currentUser.role === 'Professor' || Boolean(currentUser.ehProfessor) || ehCoordenador;

  const areasExistentesEscola = useMemo(() => {
    const padrao = [
      'Direção Geral',
      'Subdireção Pedagógica',
      'Subdireção Administrativa & Financeira',
      'Secretaria Geral',
      'Corpo Docente',
      'Coordenação Pedagógica',
      'Biblioteca',
      'Tesouraria',
      'TIC & Informática'
    ];
    const extra = funcionarios
      .filter(f => !f.escolaId || f.escolaId === escola.id)
      .flatMap(f => [f.departamento, f.cargo, f.especialidade])
      .filter((v): v is string => Boolean(v && v.trim()));
    return Array.from(new Set([...padrao, ...extra])).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [funcionarios, escola.id]);

  const classesDisponiveisMsg = useMemo(() => {
    const set = new Set<string>(turmas.map(t => t.classe).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));
  }, [turmas]);

  // Separação oficial: Comunicados vs Mensagens Diretas (com filtragem por público-alvo)
  const comunicadosLista = useMemo(() => {
    return mensagensVisiveis.filter(m => {
      const ehComunicado =
        m.tipo === 'GERAL' ||
        m.tipo === 'GRUPO' ||
        m.destinatarioTipo === 'Todos' ||
        m.destinatarioTipo === 'Encarregados' ||
        m.destinatarioTipo === 'Docentes' ||
        m.destinatarioTipo === 'Funcionarios' ||
        m.destinatarioTipo === 'Area' ||
        m.destinatarioTipo === 'Secretaria';
      if (!ehComunicado) return false;
      if (ehDirecaoOuAdmin || m.remetenteId === currentUser.id) return true;

      const dest = m.destinatarioTipo || (m.tipo === 'GERAL' ? 'Todos' : 'Todos');
      if (dest === 'Todos') return true;
      if (dest === 'Encarregados') {
        return currentUser.role === 'Encarregado' || ehDocente || ehSecretariaOuFin;
      }
      if (dest === 'Docentes') {
        return ehDocente;
      }
      if (dest === 'Funcionarios') {
        return currentUser.role !== 'Encarregado';
      }
      if (dest === 'Secretaria') {
        return ehSecretariaOuFin;
      }
      if (dest === 'Area') {
        const alvo = (m.areaDestino || '').trim().toLowerCase();
        if (!alvo) return currentUser.role !== 'Encarregado';
        const meuContexto = [
          currentUser.departamento,
          currentUser.especialidade,
          currentUser.cargo,
          currentUser.role
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return (
          meuContexto.includes(alvo) ||
          (alvo.includes('docente') && ehDocente) ||
          (alvo.includes('pedag') && (ehCoordenador || roleNorm.includes('pedag'))) ||
          (alvo.includes('secretaria') && ehSecretariaOuFin) ||
          (alvo.includes('tesouraria') && roleNorm === 'tesoureiro') ||
          (alvo.includes('biblioteca') && roleNorm === 'bibliotecario') ||
          (alvo.includes('tic') && roleNorm === 'tecnicoti')
        );
      }
      return true;
    });
  }, [mensagensVisiveis, ehDirecaoOuAdmin, currentUser, ehDocente, ehSecretariaOuFin, ehCoordenador, roleNorm]);

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
  const [tipoDestino, setTipoDestino] = useState<'Todos' | 'Encarregados' | 'Docentes' | 'Funcionarios' | 'Area' | 'Secretaria' | 'Individual'>('Todos');
  const [areaDestino, setAreaDestino] = useState('Secretaria Geral');
  const [classeDestino, setClasseDestino] = useState('');
  const [turmaIdDestino, setTurmaIdDestino] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [assunto, setAssunto] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [prioridadeMsg, setPrioridadeMsg] = useState<'Normal' | 'Urgente'>('Normal');
  const [hpMsgTrap, setHpMsgTrap] = useState('');
  const [erroAntiSpam, setErroAntiSpam] = useState<string | null>(null);

  const turmasParaDestinoEncarregado = useMemo(() => {
    if (!classeDestino) return turmas;
    return turmas.filter(t => t.classe === classeDestino);
  }, [turmas, classeDestino]);

  // Estado upload de livro PDF (Direção & Professores) e leitor/descarga offline
  const [showNovoLivroModal, setShowNovoLivroModal] = useState(false);
  const [livroTitulo, setLivroTitulo] = useState('');
  const [livroAutor, setLivroAutor] = useState('');
  const [livroCategoria, setLivroCategoria] = useState<'Manual MED' | 'Livro Didático' | 'Sebenta / Apontamentos' | 'Literatura' | 'Regulamento'>('Manual MED');
  const [livroClasse, setLivroClasse] = useState('Todas');
  const [livroDisciplina, setLivroDisciplina] = useState('');
  const [livroDescricao, setLivroDescricao] = useState('');
  const [livroModoUpload, setLivroModoUpload] = useState<'PDF' | 'Link'>('PDF');
  const [livroUrl, setLivroUrl] = useState('');
  const [arquivoPdfSelecionado, setArquivoPdfSelecionado] = useState<File | null>(null);
  const [salvandoLivroPdf, setSalvandoLivroPdf] = useState(false);
  const [erroUploadPdf, setErroUploadPdf] = useState<string | null>(null);

  const [buscaBiblioteca, setBuscaBiblioteca] = useState('');
  const [filtroCategoriaBib, setFiltroCategoriaBib] = useState('TODAS');
  const [pdfsLocaisIds, setPdfsLocaisIds] = useState<Set<string>>(new Set());
  const [carregandoPdfId, setCarregandoPdfId] = useState<string | null>(null);
  const [leitorLivro, setLeitorLivro] = useState<DocumentoBiblioteca | null>(null);
  const [leitorBlobUrl, setLeitorBlobUrl] = useState<string | null>(null);
  const [leitorDataUrl, setLeitorDataUrl] = useState<string | null>(null);
  const [feedbackBiblioteca, setFeedbackBiblioteca] = useState<string | null>(null);

  const podeGerirLivros = useMemo(() => {
    const rolesGestao = [
      'AdminGeral',
      'DiretorGeral',
      'SubdiretorPedagogico',
      'SubdirectorAdministrativo',
      'SubdiretorAdministrativo',
      'CoordenadorPedagogico',
      'CoordenadorTurno',
      'CoordenadorDisciplina',
      'Professor',
      'Bibliotecario'
    ];
    return rolesGestao.includes(currentUser.role) || Boolean(currentUser.ehProfessor);
  }, [currentUser.role, currentUser.ehProfessor]);

  const podeControlarAcessoBiblioteca = useMemo(() => {
    return [
      'AdminGeral',
      'DiretorGeral',
      'SubdiretorPedagogico',
      'SubdirectorAdministrativo',
      'SubdiretorAdministrativo',
      'CoordenadorPedagogico',
      'Secretaria',
      'ChefeSecretaria',
      'Secretario',
      'SecretarioEscolar',
      'Bibliotecario',
      'Professor'
    ].includes(currentUser.role);
  }, [currentUser.role]);

  const atualizarStatusPdfsLocais = async () => {
    try {
      const ids = await offlineStorage.listarIdsPdfsLocais();
      setPdfsLocaisIds(new Set(ids));
    } catch {}
  };

  useEffect(() => {
    atualizarStatusPdfsLocais();
  }, [livros.length, activeTab]);

  useEffect(() => {
    return () => {
      if (leitorBlobUrl) {
        URL.revokeObjectURL(leitorBlobUrl);
      }
    };
  }, [leitorBlobUrl]);

  const livrosFiltrados = useMemo(() => {
    const q = buscaBiblioteca.trim().toLowerCase();
    return livros.filter(l => {
      if (filtroCategoriaBib !== 'TODAS' && l.categoria !== filtroCategoriaBib) return false;
      if (!q) return true;
      return (
        (l.titulo || '').toLowerCase().includes(q) ||
        (l.autor || '').toLowerCase().includes(q) ||
        (l.classe || '').toLowerCase().includes(q) ||
        (l.disciplina || '').toLowerCase().includes(q) ||
        (l.uploadPorNome || '').toLowerCase().includes(q)
      );
    });
  }, [livros, buscaBiblioteca, filtroCategoriaBib]);

  const handleSelecionarArquivoPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErroUploadPdf(null);
    const file = e.target.files?.[0];
    if (!file) {
      setArquivoPdfSelecionado(null);
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErroUploadPdf('Selecione exclusivamente um ficheiro em formato PDF (.pdf).');
      e.target.value = '';
      setArquivoPdfSelecionado(null);
      return;
    }
    const maxBytes = 15 * 1024 * 1024; // 15 MB por livro para sincronização chunked estável
    if (file.size > maxBytes) {
      setErroUploadPdf('O ficheiro PDF excede o limite de 15 MB para armazenamento offline e sincronização.');
      e.target.value = '';
      setArquivoPdfSelecionado(null);
      return;
    }
    setArquivoPdfSelecionado(file);
    if (!livroTitulo.trim()) {
      setLivroTitulo(file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setErroAntiSpam(null);
    if (!assunto || !conteudo) return;

    const validacao = antiSpamService.validarSubmissao({
      acao: 'envio_mensagem',
      honeypotValor: hpMsgTrap,
      conteudoPrincipal: `${assunto} ${conteudo}`,
      identificadorAutor: currentUser.id
    });
    if (!validacao.permitido) {
      setErroAntiSpam(validacao.motivo || 'Envio bloqueado pela proteção anti-spam.');
      return;
    }

    const isDirecta = activeTab === 'mensagens_diretas' || tipoDestino === 'Individual';
    const destTipoFinal = isDirecta ? 'Individual' : tipoDestino;
    const destIdFinal = isDirecta ? destinatarioId : undefined;
    const destUser = isDirecta ? funcionarios.find(f => f.id === destinatarioId) : undefined;
    const turmaDestinoObj = !isDirecta && tipoDestino === 'Encarregados' && turmaIdDestino
      ? turmas.find(t => t.id === turmaIdDestino)
      : undefined;
    const ehUrgente = prioridadeMsg === 'Urgente';

    let escopoEnvioLabel = 'Geral para Todos';
    if (isDirecta) {
      escopoEnvioLabel = destUser ? `Para: ${destUser.nomeCompleto}` : 'Mensagem Direta';
    } else if (tipoDestino === 'Encarregados') {
      const partes = [classeDestino, turmaDestinoObj?.nome].filter(Boolean);
      escopoEnvioLabel = partes.length > 0 ? `Encarregados (${partes.join(' • ')})` : 'Todos os Encarregados';
    } else if (tipoDestino === 'Docentes') {
      escopoEnvioLabel = 'Corpo Docente (Professores)';
    } else if (tipoDestino === 'Funcionarios') {
      escopoEnvioLabel = 'Funcionários em Geral';
    } else if (tipoDestino === 'Area') {
      escopoEnvioLabel = `Área: ${areaDestino}`;
    } else if (tipoDestino === 'Secretaria') {
      escopoEnvioLabel = 'Secretaria & Administração';
    }

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
      destinatarioNome: destUser?.nomeCompleto,
      areaDestino: !isDirecta && tipoDestino === 'Area' ? areaDestino : undefined,
      classeDestino: !isDirecta && tipoDestino === 'Encarregados' && classeDestino ? classeDestino : undefined,
      turmaIdDestino: !isDirecta && tipoDestino === 'Encarregados' && turmaIdDestino ? turmaIdDestino : undefined,
      turmaNomeDestino: turmaDestinoObj?.nome,
      escopoEnvioLabel,
      titulo: assunto,
      assunto,
      conteudo,
      prioridade: prioridadeMsg,
      urgente: ehUrgente,
      origemModulo: 'Comunicacao',
      lida: false,
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
      criadaEm: new Date().toISOString()
    };

    onEnviarMensagem(novaMsg);
    setAssunto('');
    setConteudo('');
    setPrioridadeMsg('Normal');
    if (tipoDestino === 'Encarregados') {
      setClasseDestino('');
      setTurmaIdDestino('');
    }
  };

  const handleEnviarAlertaUrgenteBiblioteca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bibUrgenteAssunto.trim() || !bibUrgenteConteudo.trim()) return;

    const novaMsgBib: Mensagem = {
      id: `msg-bib-${Date.now()}`,
      escolaId: escola.id,
      remetenteId: currentUser.id,
      remetenteNome: currentUser.nomeCompleto,
      remetentePapel: currentUser.cargo || currentUser.role,
      remetenteCargo: currentUser.cargo || currentUser.role,
      tipo: bibUrgenteDestino === 'Todos' ? 'GERAL' : 'GRUPO',
      destinatarioTipo: bibUrgenteDestino,
      titulo: bibUrgenteAssunto.trim(),
      assunto: bibUrgenteAssunto.trim(),
      conteudo: bibUrgenteConteudo.trim(),
      prioridade: 'Urgente',
      urgente: true,
      origemModulo: 'Biblioteca',
      lida: false,
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
      criadaEm: new Date().toISOString()
    };

    onEnviarMensagem(novaMsgBib);
    setShowUrgenteBibModal(false);
    setBibUrgenteAssunto('');
    setBibUrgenteConteudo('');
    setFeedbackQrBiblioteca('Alerta urgente da Biblioteca enviado e notificado via Service Worker ao staff!');
  };

  const handleSalvarLivro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeGerirLivros) return;
    setErroUploadPdf(null);
    if (!livroTitulo.trim()) {
      setErroUploadPdf('Informe o título do livro ou manual.');
      return;
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const hoje = new Date().toISOString().split('T')[0];

    if (livroModoUpload === 'PDF') {
      if (!arquivoPdfSelecionado) {
        setErroUploadPdf('Anexe um ficheiro PDF do seu computador ou telemóvel para guardar na biblioteca.');
        return;
      }

      setSalvandoLivroPdf(true);
      try {
        const salvo = await offlineStorage.salvarPdfBiblioteca(docId, arquivoPdfSelecionado, {
          nome: arquivoPdfSelecionado.name,
          mimeType: arquivoPdfSelecionado.type || 'application/pdf',
          updatedAt: new Date().toISOString()
        });

        const tamanhoBytes = salvo.tamanhoBytes || arquivoPdfSelecionado.size;
        const tamanhoMb = Math.max(0.01, Math.round((tamanhoBytes / (1024 * 1024)) * 100) / 100);

        const novo: DocumentoBiblioteca = {
          id: docId,
          escolaId: escola.id,
          titulo: livroTitulo.trim(),
          autor: livroAutor.trim() || currentUser.nomeCompleto,
          categoria: livroCategoria,
          classe: livroClasse,
          disciplina: livroDisciplina.trim() || undefined,
          descricao: livroDescricao.trim() || undefined,
          tamanhoBytes,
          tamanhoMb,
          url: '__idb_pdf__',
          arquivoUrl: '__idb_pdf__',
          arquivoNome: arquivoPdfSelecionado.name,
          arquivoMimeType: arquivoPdfSelecionado.type || 'application/pdf',
          arquivoArmazenamentoId: docId,
          arquivoChunksCount: salvo.chunksCount,
          tipoRecurso: 'PDF',
          dataUpload: hoje,
          carregadoEm: hoje,
          uploadPorId: currentUser.id,
          uploadPorRole: currentUser.role,
          uploadPorNome: currentUser.nomeCompleto
        };

        onAdicionarLivro(novo);
        await atualizarStatusPdfsLocais();
        setShowNovoLivroModal(false);
        setLivroTitulo('');
        setLivroAutor('');
        setLivroDisciplina('');
        setLivroDescricao('');
        setArquivoPdfSelecionado(null);
        setFeedbackBiblioteca(
          `Livro "${novo.titulo}" (${tamanhoMb} MB) adicionado offline à biblioteca e pronto para leitura e download!`
        );
      } catch {
        setErroUploadPdf('Não foi possível processar o ficheiro PDF. Tente novamente.');
      } finally {
        setSalvandoLivroPdf(false);
      }
      return;
    }

    // Modo Link externo opcional
    if (!livroUrl.trim()) {
      setErroUploadPdf('Informe o endereço URL do documento PDF.');
      return;
    }
    const novoLink: DocumentoBiblioteca = {
      id: docId,
      escolaId: escola.id,
      titulo: livroTitulo.trim(),
      autor: livroAutor.trim() || 'Ministério da Educação (MED)',
      categoria: livroCategoria,
      classe: livroClasse,
      disciplina: livroDisciplina.trim() || undefined,
      descricao: livroDescricao.trim() || undefined,
      tamanhoBytes: 0,
      tamanhoMb: 0,
      url: livroUrl.trim(),
      arquivoUrl: livroUrl.trim(),
      tipoRecurso: 'Link',
      dataUpload: hoje,
      carregadoEm: hoje,
      uploadPorId: currentUser.id,
      uploadPorRole: currentUser.role,
      uploadPorNome: currentUser.nomeCompleto
    };

    onAdicionarLivro(novoLink);
    setShowNovoLivroModal(false);
    setLivroTitulo('');
    setLivroUrl('');
    setLivroDisciplina('');
    setLivroDescricao('');
    setFeedbackBiblioteca(`Referência "${novoLink.titulo}" adicionada à biblioteca.`);
  };

  const handleLerLivroPdf = async (livro: DocumentoBiblioteca) => {
    setCarregandoPdfId(livro.id);
    setFeedbackBiblioteca(null);
    try {
      const blob = await firebaseSyncEngine.baixarPdfBiblioteca(livro);
      if (blob) {
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        if (leitorBlobUrl && leitorBlobUrl.startsWith('blob:')) URL.revokeObjectURL(leitorBlobUrl);
        const objUrl = URL.createObjectURL(pdfBlob);
        setLeitorBlobUrl(objUrl);
        try {
          const b64 = await offlineStorage.obterPdfBibliotecaBase64(livro.id);
          setLeitorDataUrl(b64 || null);
        } catch {
          setLeitorDataUrl(null);
        }
        setLeitorLivro(livro);
        await atualizarStatusPdfsLocais();
      } else if (livro.tipoRecurso === 'Link' && livro.arquivoUrl && livro.arquivoUrl.startsWith('http')) {
        if (leitorBlobUrl && leitorBlobUrl.startsWith('blob:')) URL.revokeObjectURL(leitorBlobUrl);
        setLeitorBlobUrl(livro.arquivoUrl);
        setLeitorDataUrl(null);
        setLeitorLivro(livro);
      } else {
        setFeedbackBiblioteca(
          'Este livro ainda não foi descarregado para o dispositivo ou encontra-se sem ligação neste momento. Conecte-se uma vez para sincronizar o ficheiro PDF.'
        );
      }
    } catch {
      setFeedbackBiblioteca('Não foi possível abrir o ficheiro PDF para leitura. Tente usar o botão Baixar.');
    } finally {
      setCarregandoPdfId(null);
    }
  };

  const handleBaixarLivroPdf = async (livro: DocumentoBiblioteca) => {
    setCarregandoPdfId(livro.id);
    setFeedbackBiblioteca(null);
    try {
      const blob = await firebaseSyncEngine.baixarPdfBiblioteca(livro);
      const baseNome = (livro.arquivoNome || `${(livro.titulo || 'livro_sge').replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_')}`).trim();
      const nomeDownload = baseNome.toLowerCase().endsWith('.pdf') ? baseNome : `${baseNome}.pdf`;
      if (blob) {
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        const objUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = nomeDownload;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
        await atualizarStatusPdfsLocais();
        setFeedbackBiblioteca(`Download de "${nomeDownload}" iniciado com sucesso.`);
      } else if (livro.tipoRecurso === 'Link' && livro.arquivoUrl && livro.arquivoUrl.startsWith('http')) {
        const a = document.createElement('a');
        a.href = livro.arquivoUrl;
        a.download = nomeDownload;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setFeedbackBiblioteca(
          'Ficheiro PDF indisponível offline no momento. Conecte-se à internet para descarregar da nuvem.'
        );
      }
    } catch {
      setFeedbackBiblioteca('Erro ao iniciar o download do PDF. Tente novamente.');
    } finally {
      setCarregandoPdfId(null);
    }
  };

  const handleRemoverLivro = (livro: DocumentoBiblioteca) => {
    if (!podeGerirLivros) return;
    if (onExcluirLivro) {
      onExcluirLivro(livro.id);
    } else {
      dbService.excluirDocumento(livro.id);
    }
    if (leitorLivro?.id === livro.id) {
      setLeitorLivro(null);
      if (leitorBlobUrl) URL.revokeObjectURL(leitorBlobUrl);
      setLeitorBlobUrl(null);
    }
    setFeedbackBiblioteca(`Documento "${livro.titulo}" removido da biblioteca.`);
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
                                  : msg.destinatarioTipo === 'Encarregados'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {msg.destinatarioId === 'admin-geral'
                                  ? 'Para: Administrador Geral'
                                  : (msg.escopoEnvioLabel || (
                                      msg.destinatarioTipo === 'Todos'
                                        ? 'Geral para Todos'
                                        : msg.destinatarioTipo === 'Area'
                                          ? `Área: ${msg.areaDestino || 'Departamento'}`
                                          : msg.destinatarioTipo === 'Funcionarios'
                                            ? 'Funcionários em Geral'
                                            : msg.destinatarioTipo === 'Encarregados'
                                              ? 'Encarregados de Educação'
                                              : msg.destinatarioTipo
                                    ))}
                              </span>

                              {(msg.urgente || msg.prioridade === 'Urgente' || msg.prioridade === 'Critica') && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-2xs flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{msg.origemModulo === 'Biblioteca' ? 'URGENTE • BIBLIOTECA' : 'URGENTE'}</span>
                                </span>
                              )}

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
                            <h4 className="font-bold text-gray-900 text-sm mt-1">{msg.assunto || msg.titulo}</h4>
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

            {erroAntiSpam && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold">
                {erroAntiSpam}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-3 text-xs">
              <div className="sr-only" aria-hidden="true">
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpMsgTrap}
                  onChange={(e) => setHpMsgTrap(e.target.value)}
                />
              </div>
              {activeTab === 'comunicados' ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Destinatários do Comunicado</label>
                    <select
                      value={tipoDestino}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setTipoDestino(val);
                        if (val !== 'Encarregados') {
                          setClasseDestino('');
                          setTurmaIdDestino('');
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                    >
                      <option value="Todos">Toda a Comunidade Escolar</option>
                      <option value="Encarregados">Encarregados de Educação (Pais)</option>
                      <option value="Docentes">Professores (Corpo Docente)</option>
                      <option value="Funcionarios">Funcionários em Geral (Todo o Pessoal)</option>
                      <option value="Area">Membros de uma Determinada Área / Setor</option>
                      <option value="Secretaria">Secretaria &amp; Administração</option>
                    </select>
                  </div>

                  {tipoDestino === 'Area' && (
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Área / Setor Destinatário</label>
                      <select
                        value={areaDestino}
                        onChange={(e) => setAreaDestino(e.target.value)}
                        className="w-full p-2 border border-blue-300 bg-blue-50/40 rounded font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      >
                        {areasExistentesEscola.map(ar => (
                          <option key={ar} value={ar}>{ar}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {tipoDestino === 'Encarregados' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <div>
                        <label className="font-semibold text-emerald-950 block mb-1 text-[11px]">Classe (Opcional)</label>
                        <select
                          value={classeDestino}
                          onChange={(e) => {
                            setClasseDestino(e.target.value);
                            setTurmaIdDestino('');
                          }}
                          className="w-full p-1.5 border border-emerald-300 rounded bg-white text-[11px] font-semibold"
                        >
                          <option value="">Todas as Classes</option>
                          {classesDisponiveisMsg.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-emerald-950 block mb-1 text-[11px]">Turma (Opcional)</label>
                        <select
                          value={turmaIdDestino}
                          onChange={(e) => setTurmaIdDestino(e.target.value)}
                          className="w-full p-1.5 border border-emerald-300 rounded bg-white text-[11px] font-semibold"
                        >
                          <option value="">Todas as Turmas</option>
                          {turmasParaDestinoEncarregado.map(t => (
                            <option key={t.id} value={t.id}>{t.classe} • {t.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
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

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Prioridade de Notificação (Service Worker)</label>
                <select
                  value={prioridadeMsg}
                  onChange={(e) => setPrioridadeMsg(e.target.value as 'Normal' | 'Urgente')}
                  className={`w-full p-2 border rounded font-bold focus:ring-2 focus:outline-none ${
                    prioridadeMsg === 'Urgente'
                      ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-600'
                      : 'border-gray-300 bg-white text-gray-800 focus:ring-blue-600'
                  }`}
                >
                  <option value="Normal">Normal (Caixa de Entrada)</option>
                  <option value="Urgente">Urgente (Alerta Push + Som no Staff)</option>
                </select>
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
          {/* Controlo de Acesso & Empréstimos via QR Code do Passe (Direção, Bibliotecário, Secretaria e Professores) */}
          {podeControlarAcessoBiblioteca && (
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

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUrgenteBibModal(true)}
                  className="px-3.5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Alerta Urgente Biblioteca</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrScannerBiblioteca(true)}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Ler Passe Estudantil (QR)</span>
                </button>
              </div>
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
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Biblioteca Digital & Manuais Escolares (PDF Offline)</h3>
              <p className="text-xs text-gray-500">
                Repositório escolar de livros, sebentas e manuais em PDF para leitura em ecrã e download no dispositivo
              </p>
            </div>

            {podeGerirLivros && (
              <button
                type="button"
                onClick={() => {
                  setErroUploadPdf(null);
                  setShowNovoLivroModal(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Ficheiro PDF</span>
              </button>
            )}
          </div>

          {feedbackBiblioteca && (
            <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-xs text-blue-950 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-blue-700 shrink-0" />
                <span>{feedbackBiblioteca}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackBiblioteca(null)}
                className="font-bold text-blue-800 hover:underline cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Barra de pesquisa e filtro por categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-gray-200 rounded-xl p-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buscaBiblioteca}
                onChange={(e) => setBuscaBiblioteca(e.target.value)}
                placeholder="Pesquisar livro por título, autor, disciplina ou classe..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={filtroCategoriaBib}
                onChange={(e) => setFiltroCategoriaBib(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
              >
                <option value="TODAS">Todas as Categorias ({livros.length})</option>
                <option value="Manual MED">Manual MED</option>
                <option value="Livro Didático">Livro Didático</option>
                <option value="Sebenta / Apontamentos">Sebenta / Apontamentos</option>
                <option value="Literatura">Literatura</option>
                <option value="Regulamento">Regulamento</option>
              </select>
            </div>
          </div>

          {livrosFiltrados.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm font-bold text-gray-800">
                {livros.length === 0 ? 'Nenhum livro PDF carregado ainda nesta biblioteca.' : 'Nenhum livro corresponde à pesquisa.'}
              </p>
              <p className="text-xs text-gray-500">
                {podeGerirLivros
                  ? 'Clique em "Adicionar Ficheiro PDF" para carregar manuais, sebentas ou livros disponíveis para leitura e download.'
                  : 'Quando a Direção ou os Professores publicarem ficheiros PDF, aparecerão aqui prontos para ler e descarregar.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {livrosFiltrados.map((livro) => {
                const estaLocal = pdfsLocaisIds.has(livro.id);
                const emCarregamento = carregandoPdfId === livro.id;
                const podeApagar =
                  podeGerirLivros &&
                  (['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'Bibliotecario'].includes(currentUser.role) ||
                    livro.uploadPorId === currentUser.id ||
                    livro.uploadPorNome === currentUser.nomeCompleto);

                return (
                  <div key={livro.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                          {livro.categoria}
                        </span>
                        <span className="text-[10px] text-gray-600 font-semibold">
                          {livro.classe || 'Geral'}{livro.disciplina ? ` • ${livro.disciplina}` : ''}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm mt-2 leading-snug">{livro.titulo}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">Autor: {livro.autor}</p>
                      {livro.descricao && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{livro.descricao}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-medium">
                          <HardDrive className="h-3 w-3 text-emerald-700" />
                          <span>{estaLocal ? 'Salvo no dispositivo (Offline)' : livro.tipoRecurso === 'Link' ? 'Ligação Externa' : 'Disponível na Nuvem'}</span>
                        </span>
                        <span>Por {livro.uploadPorNome}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-gray-500 text-[11px] font-medium tabular-nums">
                        {livro.tamanhoMb && livro.tamanhoMb > 0 ? `${livro.tamanhoMb} MB • PDF` : 'PDF'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={emCarregamento}
                          onClick={() => handleLerLivroPdf(livro)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                          title="Abrir e ler livro PDF neste ecrã (funciona offline)"
                        >
                          {emCarregamento ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>Ler PDF</span>
                        </button>
                        <button
                          type="button"
                          disabled={emCarregamento}
                          onClick={() => handleBaixarLivroPdf(livro)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                          title="Descarregar ficheiro PDF para o dispositivo"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar</span>
                        </button>
                        {podeApagar && (
                          <button
                            type="button"
                            onClick={() => handleRemoverLivro(livro)}
                            className="p-1.5 rounded-lg text-red-700 hover:bg-red-50 border border-red-200 cursor-pointer"
                            title="Remover livro da biblioteca"
                            aria-label="Remover livro"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Histórico de Acessos e Empréstimos via QR Code */}
          {podeControlarAcessoBiblioteca && (
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
          )}
        </div>
      )}

      <QrScannerModal
        isOpen={showQrScannerBiblioteca}
        onClose={() => setShowQrScannerBiblioteca(false)}
        titulo="Leitor QR — Acesso à Biblioteca Escolar"
        subtitulo="Valide o cartão de estudante para registar entrada, consulta local ou empréstimo."
        acaoRotulo={`Registar ${tipoAcessoQr.replace(/_/g, ' ')}`}
        alunos={alunos.length > 0 ? alunos : dbService.getAlunos(escola.id)}
        turmas={turmas.length > 0 ? turmas : dbService.getTurmas().filter(t => t.escolaId === escola.id)}
        onStudentMatched={handleRegistarAcessoQrBiblioteca}
      />

      {/* Modal Adicionar Livro PDF à Biblioteca (Direção & Professores) */}
      {showNovoLivroModal && podeGerirLivros && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border-2 border-green-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Adicionar Livro / Manual PDF à Biblioteca</h3>
                <p className="text-[11px] text-gray-500">
                  O ficheiro fica guardado no dispositivo (offline) e é sincronizado com o Firebase para leitura e download por outros utilizadores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovoLivroModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {erroUploadPdf && (
              <div className="p-2.5 bg-red-50 border border-red-300 rounded-lg text-xs font-bold text-red-900">
                {erroUploadPdf}
              </div>
            )}

            <form onSubmit={handleSalvarLivro} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLivroModoUpload('PDF')}
                  className={`py-2 px-3 rounded-lg font-bold border text-xs flex items-center justify-center space-x-1.5 cursor-pointer ${
                    livroModoUpload === 'PDF'
                      ? 'bg-green-50 border-green-700 text-green-900'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Ficheiro PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLivroModoUpload('Link')}
                  className={`py-2 px-3 rounded-lg font-bold border text-xs flex items-center justify-center space-x-1.5 cursor-pointer ${
                    livroModoUpload === 'Link'
                      ? 'bg-green-50 border-green-700 text-green-900'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ligação Externa</span>
                </button>
              </div>

              {livroModoUpload === 'PDF' ? (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Selecionar Ficheiro PDF (Máx: 15 MB) <span className="text-red-600">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-green-400 bg-green-50/50 hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-colors">
                    <FileText className="h-6 w-6 text-green-700 mb-1" />
                    <span className="font-bold text-green-900 text-center">
                      {arquivoPdfSelecionado
                        ? `${arquivoPdfSelecionado.name} (${(arquivoPdfSelecionado.size / (1024 * 1024)).toFixed(2)} MB)`
                        : 'Clique aqui para escolher um ficheiro .PDF'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      Fica disponível para ler e baixar offline
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleSelecionarArquivoPdf}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">URL do Documento PDF</label>
                  <input
                    type="url"
                    required
                    value={livroUrl}
                    onChange={(e) => setLivroUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título do Livro / Manual <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  required
                  value={livroTitulo}
                  onChange={(e) => setLivroTitulo(e.target.value)}
                  placeholder="Ex: Manual de Matemática - 10ª Classe"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Autor / Editora</label>
                  <input
                    type="text"
                    value={livroAutor}
                    onChange={(e) => setLivroAutor(e.target.value)}
                    placeholder="Ex: Ministério da Educação (MED)"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Disciplina (Opcional)</label>
                  <input
                    type="text"
                    value={livroDisciplina}
                    onChange={(e) => setLivroDisciplina(e.target.value)}
                    placeholder="Ex: Matemática / Língua Portuguesa"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Categoria</label>
                  <select
                    value={livroCategoria}
                    onChange={(e) => setLivroCategoria(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                  >
                    <option value="Manual MED">Manual MED</option>
                    <option value="Livro Didático">Livro Didático</option>
                    <option value="Sebenta / Apontamentos">Sebenta / Apontamentos</option>
                    <option value="Literatura">Literatura</option>
                    <option value="Regulamento">Regulamento</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Classe / Nível</label>
                  <select
                    value={livroClasse}
                    onChange={(e) => setLivroClasse(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                  >
                    <option value="Todas">Todas as Classes</option>
                    {TODAS_CLASSES_OFICIAIS_MED.map(c => (
                      <option key={c} value={c}>{c === 'Iniciação' ? 'Iniciação' : `${c} Classe`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Resumo / Observações (Opcional)</label>
                <textarea
                  rows={2}
                  value={livroDescricao}
                  onChange={(e) => setLivroDescricao(e.target.value)}
                  placeholder="Breve descrição do conteúdo ou capítulos incluídos..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovoLivroModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoLivroPdf}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 rounded-lg flex items-center space-x-1.5 cursor-pointer"
                >
                  {salvandoLivroPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{salvandoLivroPdf ? 'A guardar PDF...' : 'Publicar na Biblioteca'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Leitor Embutido de PDF Offline / Online */}
      {leitorLivro && leitorBlobUrl && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-2 sm:p-5 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-300">
            <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-black truncate">{leitorLivro.titulo}</h3>
                <p className="text-[11px] text-slate-300 truncate">
                  {leitorLivro.autor} • {leitorLivro.categoria} • {leitorLivro.classe || 'Geral'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={leitorBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir em Nova Guia</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleBaixarLivroPdf(leitorLivro)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLeitorLivro(null);
                    if (leitorBlobUrl.startsWith('blob:')) URL.revokeObjectURL(leitorBlobUrl);
                    setLeitorBlobUrl(null);
                    setLeitorDataUrl(null);
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>Fechar</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 min-h-0 flex flex-col">
              <object
                data={leitorBlobUrl}
                type="application/pdf"
                className="w-full flex-1 rounded-lg border border-gray-300 bg-white min-h-0"
              >
                <embed
                  src={leitorDataUrl || leitorBlobUrl}
                  type="application/pdf"
                  className="w-full h-full min-h-[65vh] rounded-lg"
                />
                <div className="p-6 text-center space-y-3 bg-white rounded-lg border border-gray-200 m-4">
                  <p className="text-sm font-bold text-gray-800">
                    O visualizador embutido deste dispositivo não renderizou o PDF diretamente neste quadro.
                  </p>
                  <p className="text-xs text-gray-600">
                    Utilize os botões abaixo para abrir o documento no leitor nativo do dispositivo ou fazer o download imediato.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={leitorBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Abrir PDF no Leitor</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleBaixarLivroPdf(leitorLivro)}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar para o Dispositivo</span>
                    </button>
                  </div>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alerta Urgente da Biblioteca para o Staff */}
      {showUrgenteBibModal && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border-2 border-red-600 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-black text-gray-900">Enviar Alerta Urgente da Biblioteca</h3>
            </div>
            <p className="text-xs text-gray-600">
              Este aviso será enviado via sincronização Firebase e disparará notificação push local pelo Service Worker nos dispositivos do staff selecionado.
            </p>
            <form onSubmit={handleEnviarAlertaUrgenteBiblioteca} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Destinatários (Staff)</label>
                <select
                  value={bibUrgenteDestino}
                  onChange={(e) => setBibUrgenteDestino(e.target.value as 'Todos' | 'Docentes' | 'Secretaria')}
                  className="w-full p-2 border border-gray-300 rounded font-semibold"
                >
                  <option value="Todos">Todo o Staff da Escola</option>
                  <option value="Docentes">Corpo Docente e Coordenação</option>
                  <option value="Secretaria">Direção e Secretaria</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Assunto Urgente</label>
                <input
                  type="text"
                  required
                  value={bibUrgenteAssunto}
                  onChange={(e) => setBibUrgenteAssunto(e.target.value)}
                  placeholder="Ex: Devolução urgente de manuais / Ocorrência na Biblioteca"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Mensagem para o Staff</label>
                <textarea
                  required
                  rows={3}
                  value={bibUrgenteConteudo}
                  onChange={(e) => setBibUrgenteConteudo(e.target.value)}
                  placeholder="Descreva a mensagem urgente da biblioteca..."
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUrgenteBibModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                >
                  Disparar Alerta Push
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
