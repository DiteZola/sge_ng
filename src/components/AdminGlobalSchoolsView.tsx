import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  PauseCircle, 
  PlayCircle, 
  Key, 
  UserCheck, 
  Search, 
  ExternalLink, 
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  Edit2,
  HeartHandshake,
  Lock,
  Unlock
} from 'lucide-react';
import { Escola, Funcionario, Genero, Aluno, Turma, SolicitacaoApoioTecnico } from '../types';
import { dbService } from '../services/storage';
import { securityEngine } from '../services/securityEngine';

interface AdminGlobalSchoolsViewProps {
  escolas: Escola[];
  funcionarios: Funcionario[];
  alunos: Aluno[];
  turmas: Turma[];
  onCriarEscola: (dados: Partial<Escola>) => Escola;
  onAtualizarEscola?: (escola: Escola) => void;
  onSuspenderEscola: (escolaId: string, motivo: string) => void;
  onReativarEscola: (escolaId: string) => void;
  onEliminarEscola: (escolaId: string) => void;
  onCriarOuAtualizarDiretor: (escolaId: string, dados: {
    nomeCompleto: string;
    numeroBI: string;
    genero: Genero;
    email: string;
    telefone: string;
    password?: string;
    habilitacoes: string;
  }) => void;
  onRedefinirSenhaDiretor: (funcionarioId: string, novaSenha: string) => void;
  onSelecionarEscolaParaInspecao: (escolaId: string) => void;
  onEliminarFuncionario?: (funcionarioId: string) => void;
}

export const AdminGlobalSchoolsView: React.FC<AdminGlobalSchoolsViewProps> = ({
  escolas,
  funcionarios,
  alunos,
  turmas,
  onCriarEscola,
  onAtualizarEscola,
  onSuspenderEscola,
  onReativarEscola,
  onEliminarEscola,
  onCriarOuAtualizarDiretor,
  onRedefinirSenhaDiretor,
  onSelecionarEscolaParaInspecao,
  onEliminarFuncionario
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todas' | 'Ativas' | 'Suspensas'>('Todas');

  // Modais de Controlo
  const [modalNovaEscolaOpen, setModalNovaEscolaOpen] = useState(false);
  const [modalDiretorOpen, setModalDiretorOpen] = useState(false);
  const [modalSuspenderOpen, setModalSuspenderOpen] = useState(false);
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false);
  const [modalEditarEscolaOpen, setModalEditarEscolaOpen] = useState(false);
  const [modalEliminarDiretorOpen, setModalEliminarDiretorOpen] = useState(false);

  // Estados dos Formulários
  const [escolaSelecionada, setEscolaSelecionada] = useState<Escola | null>(null);
  const [diretorSelecionado, setDiretorSelecionado] = useState<Funcionario | null>(null);
  const [motivoSuspensao, setMotivoSuspensao] = useState('');
  const [confirmacaoEliminacao, setConfirmacaoEliminacao] = useState('');

  // Estados para Gestão de Acesso sob Apoio Técnico
  const [modalAcessoRestritoApoioOpen, setModalAcessoRestritoApoioOpen] = useState(false);
  const [modalAtenderApoioOpen, setModalAtenderApoioOpen] = useState(false);
  const [escolaAlvoApoio, setEscolaAlvoApoio] = useState<Escola | null>(null);
  const [chamadoPendenteAlvo, setChamadoPendenteAlvo] = useState<SolicitacaoApoioTecnico | null>(null);

  // Formulário Edição de Escola
  const [editNomeOficial, setEditNomeOficial] = useState('');
  const [editDenominacao, setEditDenominacao] = useState('');
  const [editSigla, setEditSigla] = useState('');
  const [editNif, setEditNif] = useState('');
  const [editProvincia, setEditProvincia] = useState('Luanda');
  const [editMunicipio, setEditMunicipio] = useState('Luanda');
  const [editEndereco, setEditEndereco] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editDecreto, setEditDecreto] = useState('');
  const [editGovernoProvincial, setEditGovernoProvincial] = useState('');
  const [editGabineteEducacao, setEditGabineteEducacao] = useState('');
  const [editAnoLectivo, setEditAnoLectivo] = useState('2025/2026');
  const [editEnsinoPrimario, setEditEnsinoPrimario] = useState(true);
  const [editTemIniciacao, setEditTemIniciacao] = useState(true);
  const [editNiveis, setEditNiveis] = useState<string[]>(['Primario']);

  // Formulário Nova Escola
  const [novaEscolaNome, setNovaEscolaNome] = useState('');
  const [novaEscolaDenominacao, setNovaEscolaDenominacao] = useState('');
  const [novaEscolaSigla, setNovaEscolaSigla] = useState('');
  const [novaEscolaNif, setNovaEscolaNif] = useState('');
  const [novaEscolaProvincia, setNovaEscolaProvincia] = useState('Luanda');
  const [novaEscolaMunicipio, setNovaEscolaMunicipio] = useState('Luanda');
  const [novaEscolaEndereco, setNovaEscolaEndereco] = useState('');
  const [novaEscolaEmail, setNovaEscolaEmail] = useState('');
  const [novaEscolaTelefone, setNovaEscolaTelefone] = useState('');
  const [novaEscolaDecreto, setNovaEscolaDecreto] = useState('');
  const [novaEscolaEnsinoPrimario, setNovaEscolaEnsinoPrimario] = useState(true);
  const [novaEscolaTemIniciacao, setNovaEscolaTemIniciacao] = useState(true);
  const [novaEscolaNiveis, setNovaEscolaNiveis] = useState<string[]>(['Primario']);

  // Formulário Diretor Geral
  const [dirNome, setDirNome] = useState('');
  const [dirBI, setDirBI] = useState('');
  const [dirGenero, setDirGenero] = useState<Genero>('M');
  const [dirEmail, setDirEmail] = useState('');
  const [dirTelefone, setDirTelefone] = useState('');
  const [dirSenha, setDirSenha] = useState('');
  const [dirHabilitacoes, setDirHabilitacoes] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [novaSenhaInput, setNovaSenhaInput] = useState('');

  // Notificação temporária de sucesso
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const mostrarSucesso = (msg: string) => {
    setMsgSucesso(msg);
    setTimeout(() => setMsgSucesso(null), 4500);
  };

  // Filtros
  const escolasFiltradas = escolas.filter(esc => {
    const matchesSearch = 
      esc.nomeOficial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (esc.sigla && esc.sigla.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (esc.provincia && esc.provincia.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (esc.municipio && esc.municipio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (esc.diretorGeralNome && esc.diretorGeralNome.toLowerCase().includes(searchTerm.toLowerCase()));

    const isSuspensa = esc.ativo === false || esc.estadoEscola === 'Suspensa';

    if (filtroEstado === 'Ativas') return matchesSearch && !isSuspensa;
    if (filtroEstado === 'Suspensas') return matchesSearch && isSuspensa;
    return matchesSearch;
  });

  // Métricas Globais
  const totalEscolas = escolas.length;
  const escolasSuspensasCount = escolas.filter(e => e.ativo === false || e.estadoEscola === 'Suspensa').length;
  const escolasAtivasCount = totalEscolas - escolasSuspensasCount;
  const totalDiretores = funcionarios.filter(f => f.role === 'DiretorGeral').length;
  const totalAlunosRede = alunos.length;

  // Handlers
  const handleCriarEscolaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaEscolaNome.trim()) return;

    onCriarEscola({
      nomeOficial: novaEscolaNome,
      denominacao: novaEscolaDenominacao,
      sigla: novaEscolaSigla || novaEscolaNome.substring(0, 4).toUpperCase(),
      nif: novaEscolaNif,
      provincia: novaEscolaProvincia,
      municipio: novaEscolaMunicipio,
      endereco: novaEscolaEndereco,
      email: novaEscolaEmail || `direcao.${novaEscolaSigla.toLowerCase() || 'escola'}@med.gov.ao`,
      contactos: novaEscolaTelefone,
      decretoCriacao: novaEscolaDecreto,
      governoProvincial: `GOVERNO PROVINCIAL DE ${novaEscolaProvincia.toUpperCase()}`,
      gabineteEducacao: 'GABINETE PROVINCIAL DA EDUCAÇÃO',
      anoLectivoActivo: '2025/2026',
      trimestreActivo: '1',
      estadoAno: 'Aberto',
      ativo: true,
      estadoEscola: 'Ativa',
      ensinoPrimario: novaEscolaEnsinoPrimario,
      temIniciacao: novaEscolaEnsinoPrimario ? novaEscolaTemIniciacao : false,
      niveisEnsino: novaEscolaNiveis
    });

    setModalNovaEscolaOpen(false);
    setNovaEscolaNome('');
    setNovaEscolaDenominacao('');
    setNovaEscolaSigla('');
    setNovaEscolaNif('');
    mostrarSucesso('Nova Instituição de Ensino registada com sucesso na Rede Central MED!');
  };

  const abrirModalCriarDiretor = (esc: Escola) => {
    setEscolaSelecionada(esc);
    const diretorAtual = funcionarios.find(f => f.escolaId === esc.id && f.role === 'DiretorGeral');
    if (diretorAtual) {
      setDirNome(diretorAtual.nomeCompleto);
      setDirBI(diretorAtual.numeroBI);
      setDirGenero(diretorAtual.genero || 'M');
      setDirEmail(diretorAtual.email);
      setDirTelefone(diretorAtual.telefone);
      setDirSenha(diretorAtual.password || '');
      setDirHabilitacoes(diretorAtual.habilitacoes);
    } else {
      setDirNome(esc.diretorGeralNome && esc.diretorGeralNome !== 'Não Atribuído' ? esc.diretorGeralNome : '');
      setDirBI('');
      setDirGenero('M');
      setDirEmail('');
      setDirTelefone('');
      setDirSenha('');
      setDirHabilitacoes('');
    }
    setModalDiretorOpen(true);
  };

  const handleSalvarDiretorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaSelecionada || !dirNome.trim() || !dirEmail.trim()) return;

    onCriarOuAtualizarDiretor(escolaSelecionada.id, {
      nomeCompleto: dirNome,
      numeroBI: dirBI,
      genero: dirGenero,
      email: dirEmail,
      telefone: dirTelefone,
      password: dirSenha,
      habilitacoes: dirHabilitacoes
    });

    setModalDiretorOpen(false);
    mostrarSucesso(`Credenciais do Diretor Geral (${dirNome}) atribuídas com sucesso à instituição!`);
  };

  const abrirModalSuspender = (esc: Escola) => {
    setEscolaSelecionada(esc);
    setMotivoSuspensao('Inspeção administrativa ministerial em curso e auditoria institucional.');
    setModalSuspenderOpen(true);
  };

  const confirmarSuspensao = () => {
    if (!escolaSelecionada) return;
    onSuspenderEscola(escolaSelecionada.id, motivoSuspensao);
    setModalSuspenderOpen(false);
    mostrarSucesso(`A escola "${escolaSelecionada.nomeOficial}" foi suspensa com sucesso.`);
  };

  const abrirModalEliminar = (esc: Escola) => {
    setEscolaSelecionada(esc);
    setConfirmacaoEliminacao('');
    setModalEliminarOpen(true);
  };

  const confirmarEliminacao = () => {
    if (!escolaSelecionada) return;
    if (confirmacaoEliminacao.trim() !== escolaSelecionada.sigla && confirmacaoEliminacao.trim() !== escolaSelecionada.nomeOficial) {
      alert('Para confirmar, digite a Sigla ou o Nome Oficial da escola exatamente como indicado.');
      return;
    }
    onEliminarEscola(escolaSelecionada.id);
    setModalEliminarOpen(false);
    mostrarSucesso(`A escola "${escolaSelecionada.nomeOficial}" foi eliminada do sistema central.`);
  };

  const abrirModalEditarEscola = (esc: Escola) => {
    setEscolaSelecionada(esc);
    setEditNomeOficial(esc.nomeOficial || '');
    setEditDenominacao(esc.denominacao || '');
    setEditSigla(esc.sigla || '');
    setEditNif(esc.nif || '');
    setEditProvincia(esc.provincia || 'Luanda');
    setEditMunicipio(esc.municipio || 'Luanda');
    setEditEndereco(esc.endereco || '');
    setEditEmail(esc.email || '');
    setEditTelefone(esc.contactos || '+244 923 000 000');
    setEditDecreto(esc.decretoCriacao || '');
    setEditGovernoProvincial(esc.governoProvincial || '');
    setEditGabineteEducacao(esc.gabineteEducacao || '');
    setEditAnoLectivo(esc.anoLectivoActivo || '2025/2026');
    const isPrim = esc.ensinoPrimario !== false;
    setEditEnsinoPrimario(isPrim);
    setEditTemIniciacao(esc.temIniciacao !== false);
    setEditNiveis(esc.niveisEnsino || ['Primario']);
    setModalEditarEscolaOpen(true);
  };

  const handleSubmeterEditarEscola = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaSelecionada) return;
    if (!editNomeOficial.trim()) {
      alert('O Nome Oficial da instituição é obrigatório.');
      return;
    }

    const dadosAtualizados: Partial<Escola> & { id: string } = {
      id: escolaSelecionada.id,
      nomeOficial: editNomeOficial.trim(),
      denominacao: editDenominacao.trim() || undefined,
      sigla: editSigla.trim().toUpperCase() || undefined,
      nif: editNif.trim() || undefined,
      provincia: editProvincia.trim(),
      municipio: editMunicipio.trim(),
      endereco: editEndereco.trim() || undefined,
      email: editEmail.trim() || undefined,
      contactos: editTelefone.trim() || undefined,
      decretoCriacao: editDecreto.trim() || undefined,
      governoProvincial: editGovernoProvincial.trim() || undefined,
      gabineteEducacao: editGabineteEducacao.trim() || undefined,
      anoLectivoActivo: editAnoLectivo.trim(),
      ensinoPrimario: editEnsinoPrimario,
      temIniciacao: editEnsinoPrimario ? editTemIniciacao : false,
      niveisEnsino: editNiveis
    };

    const atualizada = dbService.atualizarEscolaCompleta(dadosAtualizados);
    if (onAtualizarEscola) {
      onAtualizarEscola(atualizada);
    }
    setModalEditarEscolaOpen(false);
    mostrarSucesso(`Instituição "${atualizada.nomeOficial}" atualizada com sucesso!`);
  };

  const abrirModalSenha = (func: Funcionario) => {
    setDiretorSelecionado(func);
    setNovaSenhaInput(func.password || 'Dir2026!');
    setModalSenhaOpen(true);
  };

  const salvarNovaSenha = async () => {
    if (!diretorSelecionado || !novaSenhaInput.trim()) return;
    try {
      const operador = dbService.getCurrentUser();
      if (dbService.alterarSenhaPorOperador && operador) {
        await dbService.alterarSenhaPorOperador(diretorSelecionado.id, novaSenhaInput.trim(), operador);
      } else {
        onRedefinirSenhaDiretor(diretorSelecionado.id, novaSenhaInput.trim());
      }
      // Garante o desbloqueio da conta
      securityEngine.resetarBloqueioCredenciais(diretorSelecionado.email || diretorSelecionado.id, operador?.nomeCompleto || 'Admin Geral');
      setModalSenhaOpen(false);
      mostrarSucesso(`Palavra-passe de ${diretorSelecionado.nomeCompleto} atualizada com proteção AES-256 e acesso desbloqueado!`);
    } catch (err: any) {
      alert(err?.message || 'Falha ao redefinir a palavra-passe do Diretor.');
    }
  };

  const abrirModalEliminarDiretor = (esc: Escola, dir: Funcionario) => {
    setEscolaSelecionada(esc);
    setDiretorSelecionado(dir);
    setModalEliminarDiretorOpen(true);
  };

  const handleConfirmarEliminarDiretor = () => {
    if (!diretorSelecionado || !escolaSelecionada) return;
    const nomeDir = diretorSelecionado.nomeCompleto;
    if (onEliminarFuncionario) {
      onEliminarFuncionario(diretorSelecionado.id);
    } else {
      dbService.eliminarFuncionario(diretorSelecionado.id);
    }
    // Desvincular o diretor da escola
    const escAtualizada: Escola = {
      ...escolaSelecionada,
      diretorGeralNome: 'Não Atribuído',
      diretorGeralId: undefined
    };
    if (onAtualizarEscola) {
      onAtualizarEscola(escAtualizada);
    } else {
      dbService.salvarEscola(escAtualizada);
    }
    setModalEliminarDiretorOpen(false);
    mostrarSucesso(`Diretor Geral "${nomeDir}" foi eliminado com sucesso do sistema e do Firebase.`);
  };

  const gerarSenhaForte = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Dir';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setDirSenha(pass);
    setNovaSenhaInput(pass);
  };

  // Gestão de Acesso Restrito sob Pedido de Apoio Técnico da Direção
  const handleTentarInspecionarEscola = (esc: Escola) => {
    // 1. Se a escola já possui uma sessão ativa de apoio técnico autorizada
    if (esc.sessaoApoioTecnicoAtiva) {
      onSelecionarEscolaParaInspecao(esc.id);
      return;
    }

    // 2. Verificar se existe solicitação de apoio técnico aberta pelo Diretor Geral da escola
    const chamados = dbService.getSolicitacoesApoioTecnico();
    const pendente = chamados.find(s => s.escolaId === esc.id && (s.estado === 'Aberto' || s.estado === 'Em_Atendimento'));

    if (pendente) {
      setEscolaAlvoApoio(esc);
      setChamadoPendenteAlvo(pendente);
      setModalAtenderApoioOpen(true);
      return;
    }

    // 3. Sem pedido do Diretor: O Admin Geral NÃO pode entrar na escola
    setEscolaAlvoApoio(esc);
    setModalAcessoRestritoApoioOpen(true);
  };

  const handleConfirmarInicioApoio = () => {
    if (!escolaAlvoApoio || !chamadoPendenteAlvo) return;
    const operador = dbService.getCurrentUser();
    dbService.iniciarSessaoApoioTecnico(
      escolaAlvoApoio.id, 
      chamadoPendenteAlvo.id, 
      operador, 
      chamadoPendenteAlvo.motivo || chamadoPendenteAlvo.descricao
    );
    setModalAtenderApoioOpen(false);
    onSelecionarEscolaParaInspecao(escolaAlvoApoio.id);
  };

  const handleCriarChamadoTeste = () => {
    if (!escolaAlvoApoio) return;
    const diretor = funcionarios.find(f => f.id === escolaAlvoApoio.diretorGeralId || (f.escolaId === escolaAlvoApoio.id && f.role === 'DiretorGeral'));
    const novoChamado: SolicitacaoApoioTecnico = {
      id: `ap-${Date.now()}`,
      escolaId: escolaAlvoApoio.id,
      escolaNome: escolaAlvoApoio.nomeOficial,
      diretorId: diretor?.id || 'dir-auto',
      diretorNome: diretor?.nomeCompleto || escolaAlvoApoio.diretorGeralNome || 'Diretor Geral',
      dataSolicitacao: new Date().toISOString(),
      categoria: 'Suporte Operacional & Pautas',
      prioridade: 'Alta',
      estado: 'Aberto',
      assunto: 'Apoio Técnico Solicitado pelo Diretor Geral para Intervenção no SGE',
      descricao: 'Solicitação de apoio técnico emitida pelo Gabinete do Diretor Geral para resolução de configurações operacionais e homologação.',
      motivo: 'Apoio à Direção Geral na parametrização escolar'
    };
    dbService.adicionarSolicitacaoApoioTecnico(novoChamado);
    setChamadoPendenteAlvo(novoChamado);
    setModalAcessoRestritoApoioOpen(false);
    setModalAtenderApoioOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Mensagem de Feedback */}
      {msgSucesso && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <span className="text-sm font-semibold">{msgSucesso}</span>
          </div>
          <button onClick={() => setMsgSucesso(null)} className="text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Central de Governança */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />
              <span>Nível Superior • Ministério da Educação (MED Angola)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gestão Central da Rede Escolar & Diretores Gerais
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Como <strong>Administrador Geral</strong>, você tem independência institucional: cria novas escolas, 
              decreta a suspensão administrativa de estabelecimentos, reativa ou elimina instituições, 
              e nomeia os respetivos <strong>Diretores Gerais</strong> com geração e custódia de credenciais de acesso oficiais.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalNovaEscolaOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-5 w-5" />
            <span>Registar Nova Escola</span>
          </button>
        </div>

        {/* Estatísticas Macro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 font-medium block">Total de Escolas</span>
            <span className="text-2xl font-black text-white">{totalEscolas}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <span className="text-xs text-emerald-400 font-medium block">Escolas Ativas</span>
            <span className="text-2xl font-black text-emerald-300">{escolasAtivasCount}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <span className="text-xs text-rose-400 font-medium block">Escolas Suspensas</span>
            <span className="text-2xl font-black text-rose-300">{escolasSuspensasCount}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <span className="text-xs text-blue-400 font-medium block">Diretores Nomeados</span>
            <span className="text-2xl font-black text-blue-200">{totalDiretores}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar escola por nome, sigla, província ou diretor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-semibold">Estado:</span>
          {(['Todas', 'Ativas', 'Suspensas'] as const).map(est => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filtroEstado === est 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Escolas */}
      <div className="space-y-4">
        {escolasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 className="h-12 w-12 text-indigo-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-800">
              {totalEscolas === 0 ? 'Nenhuma instituição registada na rede nacional' : 'Nenhuma escola encontrada com este filtro'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {totalEscolas === 0 
                ? 'O sistema encontra-se no estado virgem inicial. Clique no botão abaixo para cadastrar a primeira instituição de ensino da rede.' 
                : 'Ajuste os filtros de busca ou província para localizar a instituição.'}
            </p>
            {totalEscolas === 0 && (
              <button
                type="button"
                onClick={() => setModalNovaEscolaOpen(true)}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registar Primeira Escola Agora</span>
              </button>
            )}
          </div>
        ) : (
          escolasFiltradas.map(esc => {
            const isSuspensa = esc.ativo === false || esc.estadoEscola === 'Suspensa';
            const diretorFunc = funcionarios.find(f => 
              (esc.diretorGeralId && f.id === esc.diretorGeralId) || 
              (f.escolaId === esc.id && f.role === 'DiretorGeral') || 
              (esc.diretorGeralNome && esc.diretorGeralNome !== 'Não Atribuído' && f.nomeCompleto.toLowerCase() === esc.diretorGeralNome.toLowerCase())
            );
            const totalAlunosEscola = alunos.filter(a => a.escolaId === esc.id).length;
            const totalTurmasEscola = turmas.filter(t => t.escolaId === esc.id).length;

            return (
              <div 
                key={esc.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                  isSuspensa 
                    ? 'border-red-300 bg-red-50/20' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="p-5 sm:p-6">
                  {/* Top Bar da Escola: Nome, Código, Status e Ações Globais */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="h-14 w-14 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {esc.logotipo ? (
                          <img 
                            src={esc.logotipo} 
                            alt={esc.nomeOficial} 
                            className="h-full w-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building2 className="h-7 w-7 text-blue-700" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h2 className="text-lg font-black text-gray-900 leading-snug">
                            {esc.nomeOficial}
                          </h2>
                          <span className="px-2 py-0.5 text-xs font-extrabold bg-blue-100 text-blue-800 rounded-md">
                            {esc.sigla}
                          </span>
                          {isSuspensa ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-xs font-black bg-red-100 text-red-700 border border-red-200 rounded-full">
                              <PauseCircle className="h-3 w-3" />
                              <span>SUSPENSA</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>ATIVA</span>
                            </span>
                          )}
                        </div>

                        {esc.denominacao && (
                          <p className="text-xs text-blue-700 font-semibold mt-0.5">
                            "{esc.denominacao}"
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2 flex-wrap gap-y-1">
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{esc.municipio}, {esc.provincia}</span>
                          </span>
                          <span>•</span>
                          <span>NIF: <strong>{esc.nif}</strong></span>
                          <span>•</span>
                          <span>Decreto: <em>{esc.decretoCriacao}</em></span>
                          <span>•</span>
                          <span>Alunos: <strong>{totalAlunosEscola}</strong></span>
                          <span>•</span>
                          <span>Turmas: <strong>{totalTurmasEscola}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação do Admin Geral sobre a Escola */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 lg:pt-0">
                      {esc.sessaoApoioTecnicoAtiva ? (
                        <button
                          type="button"
                          onClick={() => handleTentarInspecionarEscola(esc)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                          title="Sessão de apoio técnico ativa - Acesso total autorizado"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                          <span>Aceder (Apoio Ativo)</span>
                        </button>
                      ) : dbService.getSolicitacoesApoioTecnico().some(s => s.escolaId === esc.id && (s.estado === 'Aberto' || s.estado === 'Em_Atendimento')) ? (
                        <button
                          type="button"
                          onClick={() => handleTentarInspecionarEscola(esc)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer animate-pulse"
                          title="Pedido de apoio técnico do Diretor pendente de atendimento"
                        >
                          <HeartHandshake className="h-3.5 w-3.5 text-amber-700" />
                          <span>Atender Apoio Técnico</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTentarInspecionarEscola(esc)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                          title="Entrada restrita: Requer pedido formal do Diretor Geral da escola"
                        >
                          <Lock className="h-3.5 w-3.5 text-gray-600" />
                          <span>Entrar na Escola</span>
                        </button>
                      )}

                      {isSuspensa ? (
                        <button
                          type="button"
                          onClick={() => onReativarEscola(esc.id)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <PlayCircle className="h-3.5 w-3.5 text-emerald-700" />
                          <span>Reativar Escola</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirModalSuspender(esc)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <PauseCircle className="h-3.5 w-3.5 text-amber-700" />
                          <span>Suspender</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => abrirModalEditarEscola(esc)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Editar dados cadastrais e institucionais da escola"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirModalEliminar(esc)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar escola definitivamente"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  {/* Alerta se a Escola estiver Suspensa */}
                  {isSuspensa && (
                    <div className="mt-4 p-3 bg-red-100/70 border border-red-300 rounded-xl text-xs text-red-900 flex items-start space-x-2.5">
                      <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Instituição sob Suspensão Administrativa:</p>
                        <p className="mt-0.5 text-red-800">
                          {esc.motivoSuspensao || 'Suspensão determinada pelo Administrador Geral do Sistema.'}
                          {esc.dataSuspensao && <span className="ml-1 text-red-700">({esc.dataSuspensao})</span>}
                        </p>
                        <p className="text-[11px] text-red-700 mt-1 font-semibold">
                          O Diretor Geral e todos os funcionários desta escola têm o acesso ao sistema temporariamente congelado.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Secção do Diretor Geral e suas Credenciais */}
                  <div className="mt-5 pt-4 border-t border-gray-100 bg-gray-50/70 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 rounded-b-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                          Diretor Geral & Credenciais de Acesso
                        </span>
                        {diretorFunc ? (
                          <div className="mt-1 flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-sm font-black text-gray-900">
                              {diretorFunc.nomeCompleto}
                            </span>
                            <span className="text-xs text-gray-500">• BI: {diretorFunc.numeroBI}</span>
                            <span className="text-xs text-gray-500">• Login/Email: <strong className="text-blue-700">{diretorFunc.email}</strong></span>
                            {diretorFunc.statusConta === 'Suspensa' ? (
                              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Conta Suspensa</span>
                            ) : (
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Credenciais Ativas</span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-amber-700 font-semibold flex items-center space-x-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span>Nenhum Diretor Geral oficial com credenciais ativas associado a esta instituição.</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {diretorFunc ? (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirModalSenha(diretorFunc)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              title="Visualizar ou alterar palavra-passe do Diretor"
                            >
                              <Key className="h-3.5 w-3.5 text-gray-600" />
                              <span>Ver / Redefinir Senha</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirModalCriarDiretor(esc)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                              <span>Editar Diretor</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirModalEliminarDiretor(esc, diretorFunc)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar Diretor Geral do sistema e do Firebase"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              <span>Eliminar Diretor</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirModalCriarDiretor(esc)}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Criar Diretor Geral & Credenciais</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Registar Nova Escola */}
      {modalNovaEscolaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-black text-gray-900">Registar Nova Instituição de Ensino</h3>
              </div>
              <button 
                type="button"
                onClick={() => setModalNovaEscolaOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCriarEscolaSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nome Oficial da Escola *</label>
                <input
                  type="text"
                  required
                  value={novaEscolaNome}
                  onChange={(e) => setNovaEscolaNome(e.target.value)}
                  placeholder="Ex: Complexo Escolar n.º 2045 do Kilamba"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Denominação / Homenagem</label>
                  <input
                    type="text"
                    value={novaEscolaDenominacao}
                    onChange={(e) => setNovaEscolaDenominacao(e.target.value)}
                    placeholder="Ex: Comandante Gika ou Ciências Humanas"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Sigla Institucional *</label>
                  <input
                    type="text"
                    required
                    value={novaEscolaSigla}
                    onChange={(e) => setNovaEscolaSigla(e.target.value)}
                    placeholder="Ex: CE-2045"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">NIF da Instituição</label>
                  <input
                    type="text"
                    value={novaEscolaNif}
                    onChange={(e) => setNovaEscolaNif(e.target.value)}
                    placeholder="5419000000"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Província *</label>
                  <select
                    value={novaEscolaProvincia}
                    onChange={(e) => setNovaEscolaProvincia(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {['Luanda', 'Benguela', 'Huíla', 'Zaire', 'Cabinda', 'Uíge', 'Cuanza Sul', 'Huambo', 'Bié', 'Moxico', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Namibe', 'Cunene', 'Cuando Cubango', 'Bengo', 'Cuanza Norte'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Município *</label>
                  <input
                    type="text"
                    required
                    value={novaEscolaMunicipio}
                    onChange={(e) => setNovaEscolaMunicipio(e.target.value)}
                    placeholder="Ex: Belas, Viana, Mbanza Kongo"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Endereço Físico / Bairro</label>
                <input
                  type="text"
                  value={novaEscolaEndereco}
                  onChange={(e) => setNovaEscolaEndereco(e.target.value)}
                  placeholder="Ex: Bairro Central, Quarteirão 4"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email Institucional</label>
                  <input
                    type="email"
                    value={novaEscolaEmail}
                    onChange={(e) => setNovaEscolaEmail(e.target.value)}
                    placeholder="direcao@escola.med.gov.ao"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Contacto Telefónico</label>
                  <input
                    type="text"
                    value={novaEscolaTelefone}
                    onChange={(e) => setNovaEscolaTelefone(e.target.value)}
                    placeholder="+244 9..."
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Decreto de Criação Legal (MED)</label>
                <input
                  type="text"
                  value={novaEscolaDecreto}
                  onChange={(e) => setNovaEscolaDecreto(e.target.value)}
                  placeholder="Ex: Decreto Executivo n.º 250/18 de 06 de Outubro"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* SELEÇÃO OBRIGATÓRIA DE NÍVEL E CLASSE DA INICIAÇÃO */}
              <div className="p-4 bg-blue-50/80 border-2 border-blue-200 rounded-xl space-y-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">
                    Níveis de Ensino Lecionados na Instituição *
                  </label>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center space-x-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novaEscolaEnsinoPrimario}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNovaEscolaEnsinoPrimario(checked);
                          setNovaEscolaNiveis(prev => checked ? Array.from(new Set([...prev, 'Primario'])) : prev.filter(n => n !== 'Primario'));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Ensino Primário (1ª à 6ª Classe)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novaEscolaNiveis.includes('ICiclo')}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNovaEscolaNiveis(prev => checked ? Array.from(new Set([...prev, 'ICiclo'])) : prev.filter(n => n !== 'ICiclo'));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Iº Ciclo Secundário (7ª à 9ª Classe)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novaEscolaNiveis.includes('IICiclo')}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNovaEscolaNiveis(prev => checked ? Array.from(new Set([...prev, 'IICiclo'])) : prev.filter(n => n !== 'IICiclo'));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>IIº Ciclo / Técnico (10ª à 12ª/13ª Classe)</span>
                    </label>
                  </div>
                </div>

                {/* OPÇÃO DA CLASSE DE INICIAÇÃO QUANDO É ENSINO PRIMÁRIO */}
                {novaEscolaEnsinoPrimario && (
                  <div className="pt-3 border-t border-blue-200">
                    <label className="font-black text-blue-950 block mb-1">
                      A Instituição possui Classe da Iniciação (Pré-Escolar)? *
                    </label>
                    <p className="text-[11px] text-blue-800 mb-2.5">
                      Determinação Oficial MED Angola: No cadastro do Ensino Primário é obrigatório definir se a escola acolhe turmas de Iniciação (5–6 anos) com pautas qualitativas ou leciona estritamente a partir da 1ª Classe.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center space-x-2.5 transition-all ${
                        novaEscolaTemIniciacao 
                          ? 'bg-white border-blue-600 text-blue-950 shadow-xs ring-2 ring-blue-100' 
                          : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="novaEscolaIniciacaoRadio"
                          checked={novaEscolaTemIniciacao === true}
                          onChange={() => setNovaEscolaTemIniciacao(true)}
                          className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <div>
                          <span className="font-black block text-xs text-blue-900">Sim, Possui Classe da Iniciação</span>
                          <span className="text-[10px] text-gray-600">Acolhe turmas de Iniciação (Conceitos MB, B, S, I)</span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center space-x-2.5 transition-all ${
                        !novaEscolaTemIniciacao 
                          ? 'bg-white border-blue-600 text-blue-950 shadow-xs ring-2 ring-blue-100' 
                          : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="novaEscolaIniciacaoRadio"
                          checked={novaEscolaTemIniciacao === false}
                          onChange={() => setNovaEscolaTemIniciacao(false)}
                          className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <div>
                          <span className="font-black block text-xs text-gray-900">Não Possui Classe da Iniciação</span>
                          <span className="text-[10px] text-gray-600">Leciona exclusivamente da 1ª à 6ª Classe</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setModalNovaEscolaOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Registar Instituição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Atribuir Diretor Geral & Credenciais */}
      {modalDiretorOpen && escolaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-black text-gray-900">Nomear Diretor Geral</h3>
                  <p className="text-xs text-blue-700 font-semibold">{escolaSelecionada.nomeOficial}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setModalDiretorOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarDiretorSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nome Completo do Diretor Geral *</label>
                <input
                  type="text"
                  required
                  value={dirNome}
                  onChange={(e) => setDirNome(e.target.value)}
                  placeholder="Ex: Dr. Soares Lucas António"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">N.º do Bilhete de Identidade (BI) *</label>
                  <input
                    type="text"
                    required
                    value={dirBI}
                    onChange={(e) => setDirBI(e.target.value)}
                    placeholder="001928374LA049"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Gênero</label>
                  <select
                    value={dirGenero}
                    onChange={(e) => setDirGenero(e.target.value as Genero)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Habilitações Literárias</label>
                <input
                  type="text"
                  value={dirHabilitacoes}
                  onChange={(e) => setDirHabilitacoes(e.target.value)}
                  placeholder="Ex: Licenciatura em Gestão e Administração Escolar"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">E-mail Institucional (Login de Acesso) *</label>
                  <input
                    type="email"
                    required
                    value={dirEmail}
                    onChange={(e) => setDirEmail(e.target.value)}
                    placeholder="diretor@med.gov.ao"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Telefone Directo</label>
                  <input
                    type="text"
                    value={dirTelefone}
                    onChange={(e) => setDirTelefone(e.target.value)}
                    placeholder="+244 923 000 000"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Definição de Credenciais */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center space-x-1.5">
                    <Key className="h-3.5 w-3.5 text-blue-600" />
                    <span>Palavra-passe de Acesso Inicial *</span>
                  </label>
                  <button
                    type="button"
                    onClick={gerarSenhaForte}
                    className="text-[11px] text-blue-700 font-bold hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Gerar Senha</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    value={dirSenha}
                    onChange={(e) => setDirSenha(e.target.value)}
                    className="w-full p-2 pr-10 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-blue-800">
                  Esta senha será entregue ao Diretor Geral para iniciar a sua sessão na instituição.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setModalDiretorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Salvar e Emitir Credenciais
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Suspender Escola */}
      {modalSuspenderOpen && escolaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center space-x-3 text-amber-600 mb-3">
              <ShieldAlert className="h-7 w-7 shrink-0" />
              <h3 className="text-lg font-black text-gray-900">Decretar Suspensão Escolar</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Está prestes a suspender administrativamente a instituição <strong>"{escolaSelecionada.nomeOficial}"</strong>.
              Durante a suspensão, o Diretor Geral, professores e funcionários não poderão operar o sistema.
            </p>

            <div className="mt-4">
              <label className="font-bold text-gray-700 block mb-1 text-xs">Motivo Oficial da Suspensão *</label>
              <textarea
                required
                rows={3}
                value={motivoSuspensao}
                onChange={(e) => setMotivoSuspensao(e.target.value)}
                placeholder="Indique os motivos jurídicos ou pedagógicos da suspensão..."
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2.5 mt-5 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setModalSuspenderOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarSuspensao}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm cursor-pointer"
              >
                Confirmar Suspensão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Eliminar Escola */}
      {modalEliminarOpen && escolaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <Trash2 className="h-7 w-7 shrink-0" />
              <h3 className="text-lg font-black text-gray-900">Eliminar Estabelecimento Escolar</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Atenção: A eliminação da escola <strong>"{escolaSelecionada.nomeOficial}"</strong> removerá o registo da instituição do sistema central.
            </p>

            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <p className="font-semibold">Para confirmar a eliminação, digite a Sigla da escola ({escolaSelecionada.sigla}):</p>
              <input
                type="text"
                value={confirmacaoEliminacao}
                onChange={(e) => setConfirmacaoEliminacao(e.target.value)}
                placeholder={escolaSelecionada.sigla}
                className="w-full mt-2 p-2 border border-red-300 rounded-lg bg-white focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2.5 mt-5 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setModalEliminarOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacao}
                disabled={confirmacaoEliminacao.trim() !== escolaSelecionada.sigla && confirmacaoEliminacao.trim() !== escolaSelecionada.nomeOficial}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm cursor-pointer"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ver / Redefinir Senha do Diretor */}
      {modalSenhaOpen && diretorSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center space-x-2 text-blue-600 mb-3">
              <Key className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900">Credenciais do Diretor</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 font-semibold block">Diretor Geral:</span>
                <span className="font-bold text-gray-900">{diretorSelecionado.nomeCompleto}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Email de Login:</span>
                <span className="font-bold text-blue-700">{diretorSelecionado.email}</span>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800">Palavra-passe Atual / Nova:</label>
                  <button
                    type="button"
                    onClick={gerarSenhaForte}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Gerar Nova
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={novaSenhaInput}
                    onChange={(e) => setNovaSenhaInput(e.target.value)}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-5 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setModalSenhaOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={salvarNovaSenha}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
              >
                Gravar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Escola */}
      {modalEditarEscolaOpen && escolaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Edit2 className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-black text-gray-900">Editar Instituição de Ensino</h3>
                  <p className="text-xs text-gray-500">Atualização cadastral e regulamentar da escola</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setModalEditarEscolaOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmeterEditarEscola} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="font-bold text-gray-800 block mb-1">Nome Oficial da Escola *</label>
                  <input
                    type="text"
                    required
                    value={editNomeOficial}
                    onChange={(e) => setEditNomeOficial(e.target.value)}
                    placeholder="Ex: ESCOLA DO Iº CICLO DO ENSINO SECUNDÁRIO N.º 1204"
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 uppercase font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Denominação Usual / Patrono</label>
                  <input
                    type="text"
                    value={editDenominacao}
                    onChange={(e) => setEditDenominacao(e.target.value)}
                    placeholder="Ex: Rainha Ginga"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Sigla da Escola</label>
                  <input
                    type="text"
                    value={editSigla}
                    onChange={(e) => setEditSigla(e.target.value.toUpperCase())}
                    placeholder="Ex: ESG-1204"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Número de Identificação Fiscal (NIF)</label>
                  <input
                    type="text"
                    value={editNif}
                    onChange={(e) => setEditNif(e.target.value)}
                    placeholder="5418129034"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Ano Letivo Ativo</label>
                  <input
                    type="text"
                    value={editAnoLectivo}
                    onChange={(e) => setEditAnoLectivo(e.target.value)}
                    placeholder="2025/2026"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Província</label>
                  <input
                    type="text"
                    value={editProvincia}
                    onChange={(e) => setEditProvincia(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Município</label>
                  <input
                    type="text"
                    value={editMunicipio}
                    onChange={(e) => setEditMunicipio(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-gray-800 block mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={editEndereco}
                    onChange={(e) => setEditEndereco(e.target.value)}
                    placeholder="Rua, Bairro, Ponto de Referência"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Correio Eletrónico (Email)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="escola@med.gov.ao"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Telefone Institucional</label>
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    placeholder="+244 923 000 000"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-gray-800 block mb-1">Decreto de Criação / Despacho Ministerial</label>
                  <input
                    type="text"
                    value={editDecreto}
                    onChange={(e) => setEditDecreto(e.target.value)}
                    placeholder="Decreto Executivo n.º 250/18 de 12 de Junho"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Governo Provincial</label>
                  <input
                    type="text"
                    value={editGovernoProvincial}
                    onChange={(e) => setEditGovernoProvincial(e.target.value)}
                    placeholder="GOVERNO PROVINCIAL DE LUANDA"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Gabinete Provincial de Educação</label>
                  <input
                    type="text"
                    value={editGabineteEducacao}
                    onChange={(e) => setEditGabineteEducacao(e.target.value)}
                    placeholder="GABINETE PROVINCIAL DA EDUCAÇÃO"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* CONFIGURAÇÃO DE NÍVEIS E CLASSE DA INICIAÇÃO NA EDIÇÃO */}
                <div className="md:col-span-2 p-4 bg-blue-50/80 border-2 border-blue-200 rounded-xl space-y-3">
                  <div>
                    <label className="font-bold text-gray-900 block mb-1">
                      Níveis de Ensino Lecionados nesta Instituição *
                    </label>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center space-x-2 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEnsinoPrimario}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditEnsinoPrimario(checked);
                            setEditNiveis(prev => checked ? Array.from(new Set([...prev, 'Primario'])) : prev.filter(n => n !== 'Primario'));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>Ensino Primário (1ª à 6ª Classe)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editNiveis.includes('ICiclo')}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditNiveis(prev => checked ? Array.from(new Set([...prev, 'ICiclo'])) : prev.filter(n => n !== 'ICiclo'));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>Iº Ciclo Secundário (7ª à 9ª Classe)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editNiveis.includes('IICiclo')}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditNiveis(prev => checked ? Array.from(new Set([...prev, 'IICiclo'])) : prev.filter(n => n !== 'IICiclo'));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>IIº Ciclo / Técnico (10ª à 12ª/13ª Classe)</span>
                      </label>
                    </div>
                  </div>

                  {/* OPÇÃO DA CLASSE DE INICIAÇÃO QUANDO É ENSINO PRIMÁRIO */}
                  {editEnsinoPrimario && (
                    <div className="pt-3 border-t border-blue-200">
                      <label className="font-black text-blue-950 block mb-1">
                        A Instituição possui Classe da Iniciação (Pré-Escolar)? *
                      </label>
                      <p className="text-[11px] text-blue-800 mb-2.5">
                        Norma MED Angola: Define a disponibilidade da classe de Iniciação e seus modelos avaliativos para esta escola.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center space-x-2.5 transition-all ${
                          editTemIniciacao 
                            ? 'bg-white border-blue-600 text-blue-950 shadow-xs ring-2 ring-blue-100' 
                            : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="editEscolaIniciacaoRadio"
                            checked={editTemIniciacao === true}
                            onChange={() => setEditTemIniciacao(true)}
                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <div>
                            <span className="font-black block text-xs text-blue-900">Sim, Possui Classe da Iniciação</span>
                            <span className="text-[10px] text-gray-600">Acolhe turmas de Iniciação (Conceitos MB, B, S, I)</span>
                          </div>
                        </label>

                        <label className={`p-3 rounded-xl border-2 cursor-pointer flex items-center space-x-2.5 transition-all ${
                          !editTemIniciacao 
                            ? 'bg-white border-blue-600 text-blue-950 shadow-xs ring-2 ring-blue-100' 
                            : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="editEscolaIniciacaoRadio"
                            checked={editTemIniciacao === false}
                            onChange={() => setEditTemIniciacao(false)}
                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <div>
                            <span className="font-black block text-xs text-gray-900">Não Possui Classe da Iniciação</span>
                            <span className="text-[10px] text-gray-600">Leciona exclusivamente da 1ª à 6ª Classe</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 mt-5">
                <button
                  type="button"
                  onClick={() => setModalEditarEscolaOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Salvar Alterações da Escola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ACESSO RESTRITO - EXIGE PEDIDO FORMAL DO DIRETOR */}
      {modalAcessoRestritoApoioOpen && escolaAlvoApoio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Lock className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Acesso Restrito · Autonomia Escolar MED
                </h3>
                <p className="text-xs text-gray-500">
                  Norma Ministerial de Proteção e Privacidade Institucional
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
              <p>
                <strong>Regra Estrita do Ministério da Educação:</strong> O Administrador Geral do Sistema não pode aceder aos dados internos e operacionais de uma escola (turmas, estudantes, pautas, finanças) <strong>sem uma solicitação formal prévia de Apoio Técnico emitida pelo Diretor Geral</strong> da respetiva instituição.
              </p>
              <p className="text-[11px] text-amber-800">
                Instituição visada: <strong>{escolaAlvoApoio.nomeOficial}</strong> · Diretor Titular: <strong>{escolaAlvoApoio.diretorGeralNome || 'Diretor Geral'}</strong>.
              </p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1 text-gray-600">
              <p><strong>Como proceder regularmente:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>A Direção Geral da escola deve aceder à <em>Central de Apoio Técnico</em> no seu painel.</li>
                <li>Submeter um chamado especificando a necessidade e o motivo pedagógico ou técnico.</li>
                <li>Após submissão, este botão no seu perfil permitirá a entrada com sessão auditada.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCriarChamadoTeste}
                className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                title="Cria instantaneamente um chamado pelo Diretor para permitir validar e testar todo o fluxo de suporte"
              >
                <HeartHandshake className="h-4 w-4 text-amber-700" />
                <span>Simular Chamado do Diretor (Teste)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalAcessoRestritoApoioOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl cursor-pointer"
              >
                Entendido / Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ATENDER PEDIDO DE APOIO TÉCNICO & INICIAR SESSÃO */}
      {modalAtenderApoioOpen && escolaAlvoApoio && chamadoPendenteAlvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                <HeartHandshake className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Atender Solicitação de Apoio Técnico
                </h3>
                <p className="text-xs text-gray-500">
                  Pedido formal validado · Chamado #{chamadoPendenteAlvo.id.slice(-6)}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Instituição:</span>
                <strong className="text-gray-900">{escolaAlvoApoio.nomeOficial}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diretor Solicitante:</span>
                <span className="font-bold text-blue-800">{chamadoPendenteAlvo.diretorNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data do Pedido:</span>
                <span>{new Date(chamadoPendenteAlvo.dataSolicitacao).toLocaleString('pt-AO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prioridade:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {chamadoPendenteAlvo.prioridade}
                </span>
              </div>
              <div className="pt-1.5 border-t border-gray-200">
                <span className="text-gray-500 block mb-0.5">Assunto & Motivo:</span>
                <p className="font-medium text-gray-800 italic">
                  "{chamadoPendenteAlvo.assunto}" — {chamadoPendenteAlvo.descricao}
                </p>
              </div>
            </div>

            {/* Aviso de Auditoria Forense Obrigatória */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start space-x-2">
              <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
              <p>
                <strong>Registo Imutável no Log do Diretor:</strong> Ao iniciar a sessão de apoio técnico, o Administrador Geral obtém <strong>acesso total</strong> a todos os menus e operações da escola. Cada alteração executada será expressamente assinada e gravada no Livro de Termos e Auditoria da Direção Geral.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalAtenderApoioOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarInicioApoio}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Unlock className="h-4 w-4" />
                <span>Iniciar Apoio & Aceder com Acesso Total</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: ELIMINAR DIRETOR GERAL */}
      {modalEliminarDiretorOpen && escolaSelecionada && diretorSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Eliminar Diretor Geral
                </h3>
                <p className="text-xs text-red-600 font-semibold">
                  Ação Irreversível de Gestão Ministerial
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Tem a certeza de que deseja eliminar o perfil do Diretor Geral <strong>{diretorSelecionado.nomeCompleto}</strong> da instituição <strong>{escolaSelecionada.nomeOficial}</strong>?
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p>• As credenciais de acesso ({diretorSelecionado.email}) serão revogadas imediatamente.</p>
              <p>• O registo será removido permanentemente do dispositivo e do Firebase Firestore.</p>
              <p>• A escola ficará temporariamente sem Diretor até que uma nova nomeação seja efetuada.</p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalEliminarDiretorOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminarDiretor}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Confirmar Eliminação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
