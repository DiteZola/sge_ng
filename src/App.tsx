import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { dbService, DEFAULT_ADMIN_GERAL_PRODUCAO } from './services/storage';
import { verificarIntegridadeSistema, SystemIntegrityStatus } from './services/firebaseClient';
import { 
  Escola, 
  Turma, 
  Disciplina, 
  Funcionario, 
  Aluno, 
  TipoAvaliacaoConfig, 
  RegraCalculoMAC, 
  AvaliacaoCriada, 
  NotaEstudante, 
  NotaTrimestralConsolidada, 
  SolicitacaoAlteracaoNota, 
  RegistoAssiduidade, 
  Mensagem, 
  DocumentoBiblioteca, 
  LogAuditoria, 
  ComissaoJuri,
  UserRole
} from './types';

import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AcademicManagementView } from './components/AcademicManagementView';
import { EvaluationMacView } from './components/EvaluationMacView';
import { StudentsView } from './components/StudentsView';
import { HumanResourcesView } from './components/HumanResourcesView';
import { PrintingDocumentsView } from './components/PrintingDocumentsView';
import { CommunicationLibraryView } from './components/CommunicationLibraryView';
import { SystemAuditBackupView } from './components/SystemAuditBackupView';
import { ArchitectureDocsView } from './components/ArchitectureDocsView';
import { AdminGlobalSchoolsView } from './components/AdminGlobalSchoolsView';
import { AdministrativeFinanceView } from './components/AdministrativeFinanceView';
import { InitialSetupModal } from './components/InitialSetupModal';
import { SystemInitialSetupView } from './components/SystemInitialSetupView';
import { RealtimeSecurityModal } from './components/RealtimeSecurityModal';
import { securityEngine } from './services/securityEngine';
import { cryptoService } from './services/cryptoService';
import { firebaseSyncEngine } from './services/firebaseSyncEngine';
import { LoginView } from './components/LoginView';
import { UserProfileView } from './components/UserProfileView';
import { TechnicalSupportView } from './components/TechnicalSupportView';
import { PatrimonyView } from './components/PatrimonyView';
import { JuryCommissionView } from './components/JuryCommissionView';
import { ScheduleTimetableView } from './components/ScheduleTimetableView';
import { StudentAttendanceReportView } from './components/StudentAttendanceReportView';
import { StudentPassesView } from './components/StudentPassesView';
import { ExecutiveDirectionView } from './components/ExecutiveDirectionView';
import { SchoolCalendarView } from './components/SchoolCalendarView';
import { Footer } from './components/Footer';
import { ShieldAlert, ArrowLeft, LifeBuoy, LogOut } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const isAuth = typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';
      if (!isAuth) return 'dashboard';
      const u = dbService.getCurrentUser();
      return u?.role === 'AdminGeral' ? 'dashboard' : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [integrity, setIntegrity] = useState<SystemIntegrityStatus>(verificarIntegridadeSistema());
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [temAdminGeral, setTemAdminGeral] = useState<boolean>(() => dbService.temAdminGeral());
  const [verificandoAdminOnline, setVerificandoAdminOnline] = useState<boolean>(true);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  // Estado Multi-Escola & Multi-Ano Lectivo
  const [escolas, setEscolas] = useState<Escola[]>(() => dbService.getEscolas());
  const [anosLectivos, setAnosLectivos] = useState<string[]>(() => dbService.getAnosLectivos());
  const [escola, setEscola] = useState<Escola>(() => dbService.getEscolaAtiva());

  // Estado Geral do SGE-NG
  const [turmas, setTurmas] = useState<Turma[]>(() => dbService.obterTurmas());
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>(() => dbService.obterDisciplinas());
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(() => dbService.obterFuncionarios());
  const [alunos, setAlunos] = useState<Aluno[]>(() => dbService.obterAlunos());
  const [tiposAvaliacao, setTiposAvaliacao] = useState<TipoAvaliacaoConfig[]>(() => dbService.obterTiposAvaliacao());
  const [regrasMAC, setRegrasMAC] = useState<RegraCalculoMAC[]>(() => dbService.obterRegrasMAC());
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoCriada[]>(() => dbService.obterAvaliacoes());
  const [notas, setNotas] = useState<NotaEstudante[]>(() => dbService.obterNotas());
  const [notasConsolidadas, setNotasConsolidadas] = useState<NotaTrimestralConsolidada[]>(() => dbService.obterNotasConsolidadas());
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAlteracaoNota[]>(() => dbService.obterSolicitacoes());
  const [assiduidade, setAssiduidade] = useState<RegistoAssiduidade[]>(() => dbService.obterAssiduidade());
  const [mensagens, setMensagens] = useState<Mensagem[]>(() => dbService.obterMensagens());
  const [livros, setLivros] = useState<DocumentoBiblioteca[]>(() => dbService.obterLivros());
  const [logs, setLogs] = useState<LogAuditoria[]>(() => dbService.obterLogs());
  const [juris, setJuris] = useState<ComissaoJuri[]>(() => dbService.obterJuris());
  const [atribuicoes, setAtribuicoes] = useState(() => dbService.obterAtribuicoes());

  // Utilizador Ativo
  const [authenticatedUser, setAuthenticatedUser] = useState<Funcionario | null>(() => {
    try {
      const isAuth = typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';
      if (!isAuth) return null;
      return dbService.getCurrentUser();
    } catch {
      return null;
    }
  });

  const currentUser: Funcionario = authenticatedUser || (
    funcionarios.find(f => f.role === 'AdminGeral' && f.ativo) ||
    funcionarios[0] ||
    DEFAULT_ADMIN_GERAL_PRODUCAO
  );

  // Modo de Apoio Técnico Emergencial (Admin Geral assumindo o papel de Diretor Geral)
  const [modoApoioTecnico, setModoApoioTecnico] = useState<{
    escolaId: string;
    solicitacaoId?: string;
    escolaNome: string;
    escolaOriginalId?: string;
  } | null>(null);

  const effectiveUser: Funcionario = useMemo(() => {
    if (modoApoioTecnico) {
      return {
        ...currentUser,
        role: 'DiretorGeral' as UserRole,
        cargo: `Diretor Geral (Apoio Técnico DTI/MED)`,
        escolaId: modoApoioTecnico.escolaId,
      };
    }
    return currentUser;
  }, [modoApoioTecnico, currentUser]);

  // Listener para status online/offline e verificação do Administrador Geral no Firebase
  useEffect(() => {
    let ativo = true;

    const verificarAdmin = async () => {
      try {
        const localExiste = dbService.temAdminGeral();
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const res = await dbService.verificarAdminGeralOnline();
          if (ativo) {
            setTemAdminGeral(res.existe);
            if (res.existe) {
              setFuncionarios(dbService.obterFuncionarios());
            }
          }
        } else {
          if (ativo) setTemAdminGeral(localExiste);
        }
      } catch (err) {
        console.warn('Erro ao verificar Administrador Geral no Firebase:', err);
        if (ativo) setTemAdminGeral(dbService.temAdminGeral());
      } finally {
        if (ativo) setVerificandoAdminOnline(false);
      }
    };

    const recarregarDados = () => {
      setEscolas(dbService.getEscolas());
      setEscola(dbService.getEscolaAtiva());
      setFuncionarios(dbService.obterFuncionarios());
      setTurmas(dbService.obterTurmas());
      setAlunos(dbService.obterAlunos());
      setDisciplinas(dbService.obterDisciplinas());
      setNotasConsolidadas(dbService.obterNotasConsolidadas());
      setLogs(dbService.obterLogs());
      setAnosLectivos(dbService.getAnosLectivos());
    };

    verificarAdmin();

    // Timeout de segurança de 2s para que a aplicação nunca fique presa na verificação inicial
    const timer = setTimeout(() => {
      if (ativo) setVerificandoAdminOnline(false);
    }, 2000);

    // Descarregar base de dados em tempo real do Firestore para suportar múltiplos dispositivos
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      firebaseSyncEngine.puxarTudoDoFirebase().then(() => {
        if (ativo) {
          recarregarDados();
          verificarAdmin();
        }
      });
    }

    const handleRemoteUpdate = () => {
      recarregarDados();
      verificarAdmin();
    };
    window.addEventListener('sge_dados_atualizados_remoto', handleRemoteUpdate);

    const handleOnline = () => {
      setIntegrity(verificarIntegridadeSistema());
      verificarAdmin();
      firebaseSyncEngine.puxarTudoDoFirebase().then(recarregarDados);
    };
    const handleOffline = () => setIntegrity(verificarIntegridadeSistema());
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      ativo = false;
      clearTimeout(timer);
      window.removeEventListener('sge_dados_atualizados_remoto', handleRemoteUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listener contínuo do securityEngine para notificar o AdminGeral via RealtimeSecurityModal
  useEffect(() => {
    const handleSecurityAnomaly = () => {
      if (currentUser?.role === 'AdminGeral') {
        setShowSecurityModal(true);
      }
    };

    window.addEventListener('sge_notify_admin_security_modal', handleSecurityAnomaly);
    window.addEventListener('sge_security_anomaly_detected', handleSecurityAnomaly);
    return () => {
      window.removeEventListener('sge_notify_admin_security_modal', handleSecurityAnomaly);
      window.removeEventListener('sge_security_anomaly_detected', handleSecurityAnomaly);
    };
  }, [currentUser?.role]);

  // Alternância Multi-Escola
  const handleSelectEscola = (escolaId: string) => {
    dbService.setEscolaAtiva(escolaId);
    const escolaAtiva = dbService.getEscolaAtiva();
    setEscola(escolaAtiva);
    setTurmas(dbService.obterTurmas());
    setDisciplinas(dbService.obterDisciplinas());
    setAlunos(dbService.obterAlunos());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
    setFuncionarios(dbService.obterFuncionarios());
    setLogs(dbService.obterLogs());
  };

  // Alternância de Ano Lectivo Multi-Ano
  const handleSelectAnoLectivo = (ano: string) => {
    dbService.setAnoLectivoActivo(ano);
    const escolaAtiva = dbService.getEscolaAtiva();
    setEscola({ ...escolaAtiva, anoLectivoActivo: ano });
    setAnosLectivos(dbService.getAnosLectivos());
    setTurmas(dbService.obterTurmas());
    setAlunos(dbService.obterAlunos());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
  };

  // Alternância de Trimestre
  const handleSelectTrimestre = (trimestre: '1' | '2' | '3') => {
    const escolaAtualizada: Escola = { ...escola, trimestreActivo: trimestre };
    dbService.salvarEscola(escolaAtualizada);
    setEscola(escolaAtualizada);
  };

  // RBAC Rigoroso por Perfil conforme a nova arquitetura de menus:
  const allowedTabsPorRole: Record<UserRole, NavTab[]> = {
    AdminGeral: [
      'dashboard',
      'admin_escolas',
      'ano_lectivo',
      'calendario_escolar',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'professores',
      'coordenacao',
      'direcao',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'pagamentos',
      'relatorios_financeiros',
      'biblioteca',
      'patrimonio',
      'usuarios_perfis',
      'configuracoes',
      'auditoria_logs',
      'backup_restauro',
      'apoio_tecnico',
      'meu_perfil',
      'financeiro',
      'sistema',
      'arquitetura',
      'academico',
      'estudantes',
      'avaliacoes',
      'rh',
      'comunicacao',
      'documentos',
      'formulas_notas'
    ],
    DiretorGeral: [
      'dashboard',
      'ano_lectivo',
      'calendario_escolar',
      'formulas_notas',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'professores',
      'coordenacao',
      'comissao_juri',
      'direcao',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'pagamentos',
      'relatorios_financeiros',
      'biblioteca',
      'patrimonio',
      'usuarios_perfis',
      'configuracoes',
      'auditoria_logs',
      'backup_restauro',
      'apoio_tecnico',
      'meu_perfil',
      'academico',
      'estudantes',
      'avaliacoes',
      'rh',
      'financeiro',
      'comunicacao',
      'documentos',
      'sistema',
      'arquitetura'
    ],
    SubdiretorPedagogico: [
      'dashboard',
      'ano_lectivo',
      'calendario_escolar',
      'formulas_notas',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'professores',
      'coordenacao',
      'comissao_juri',
      'direcao',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'biblioteca',
      'meu_perfil',
      'academico',
      'estudantes',
      'avaliacoes',
      'rh',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    CoordenadorPedagogico: [
      'dashboard',
      'ano_lectivo',
      'calendario_escolar',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'professores',
      'coordenacao',
      'comissao_juri',
      'direcao',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'biblioteca',
      'meu_perfil',
      'academico',
      'estudantes',
      'avaliacoes',
      'rh',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    SubdirectorAdministrativo: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'direcao',
      'declaracoes',
      'boletins',
      'passes_escolares',
      'horarios',
      'presencas',
      'pagamentos',
      'relatorios_financeiros',
      'patrimonio',
      'meu_perfil',
      'estudantes',
      'financeiro',
      'comunicacao',
      'documentos',
      'arquitetura',
      'comissao_juri'
    ],
    SubdiretorAdministrativo: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'direcao',
      'declaracoes',
      'boletins',
      'passes_escolares',
      'horarios',
      'presencas',
      'pagamentos',
      'relatorios_financeiros',
      'patrimonio',
      'meu_perfil',
      'estudantes',
      'financeiro',
      'comunicacao',
      'documentos',
      'arquitetura',
      'comissao_juri'
    ],
    Professor: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'horarios',
      'presencas',
      'coordenacao',
      'comissao_juri',
      'pautas',
      'boletins',
      'biblioteca',
      'meu_perfil',
      'estudantes',
      'avaliacoes',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    Secretaria: [
      'dashboard',
      'calendario_escolar',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'comissao_juri',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'pagamentos',
      'meu_perfil',
      'academico',
      'estudantes',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    ChefeSecretaria: [
      'dashboard',
      'calendario_escolar',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'comissao_juri',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'pagamentos',
      'relatorios_financeiros',
      'usuarios_perfis',
      'auditoria_logs',
      'meu_perfil',
      'academico',
      'estudantes',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    Secretario: [
      'dashboard',
      'calendario_escolar',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'comissao_juri',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'pagamentos',
      'meu_perfil',
      'academico',
      'estudantes',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    CoordenadorTurno: [
      'dashboard',
      'calendario_escolar',
      'classes',
      'cursos',
      'disciplinas',
      'turmas',
      'turnos',
      'horarios',
      'presencas',
      'alunos',
      'professores',
      'coordenacao',
      'comissao_juri',
      'pautas',
      'boletins',
      'meu_perfil',
      'academico',
      'estudantes',
      'avaliacoes',
      'comunicacao',
      'documentos',
      'arquitetura'
    ],
    Encarregado: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'declaracoes',
      'boletins',
      'pagamentos',
      'meu_perfil',
      'estudantes',
      'documentos',
      'comunicacao'
    ]
  };

  // Configuração Inicial do Administrador Geral (sem dependência de escola)
  const handleSaveSetup = (dadosAdmin: Partial<Funcionario>, dadosEscola?: Partial<Escola>) => {
    dbService.concluirSetupInicial(dadosAdmin, dadosEscola);
    setEscolas(dbService.getEscolas());
    setEscola(dbService.getEscolaAtiva());
    setFuncionarios(dbService.obterFuncionarios());
    setAuthenticatedUser(dbService.getCurrentUser());
    setActiveTab('dashboard');
    setLogs(dbService.obterLogs());
  };

  // Handlers do Ciclo de Vida de Escolas e Diretores (AdminGeral)
  const handleCriarEscola = (dados: Partial<Escola>): Escola => {
    const nova = dbService.criarEscola(dados);
    const escolasFrescas = dbService.getEscolas();
    setEscolas(escolasFrescas);
    if (!escola || !escola.id) {
      dbService.setEscolaAtiva(nova.id);
      setEscola(nova);
    }
    setLogs(dbService.obterLogs());
    return nova;
  };

  const handleSuspenderEscola = (escolaId: string, motivo: string) => {
    dbService.suspenderEscola(escolaId, motivo);
    setEscolas(dbService.getEscolas());
    if (escola.id === escolaId) {
      setEscola(dbService.getEscolaAtiva());
    }
    setLogs(dbService.obterLogs());
  };

  const handleReativarEscola = (escolaId: string) => {
    dbService.reativarEscola(escolaId);
    setEscolas(dbService.getEscolas());
    setLogs(dbService.obterLogs());
  };

  const handleEliminarEscola = (escolaId: string) => {
    dbService.eliminarEscola(escolaId);
    setEscolas(dbService.getEscolas());
    setEscola(dbService.getEscolaAtiva());
    setLogs(dbService.obterLogs());
  };

  const handleCriarOuAtualizarDiretor = (
    escolaIdOuDados: string | Partial<Funcionario>,
    dadosOuSenha?: any
  ): any => {
    let f: Funcionario;
    if (typeof escolaIdOuDados === 'string') {
      const escolaId = escolaIdOuDados;
      const dados = dadosOuSenha || {};
      f = {
        id: `func-${Date.now()}`,
        escolaId,
        nomeCompleto: dados.nomeCompleto,
        numeroBI: dados.numeroBI,
        genero: dados.genero || 'M',
        email: dados.email,
        telefone: dados.telefone || '+244 923 000 000',
        password: dados.password || '123456',
        habilitacoes: dados.habilitacoes || 'Licenciatura em Gestão Escolar',
        cargo: 'Diretor Geral',
        role: 'DiretorGeral',
        statusConta: 'Ativa',
        ativo: true,
        ehProfessor: false,
        ehAdministrativoQueLeciona: false,
        fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        dataAdmissao: new Date().toISOString().split('T')[0]
      };
    } else {
      f = {
        ...escolaIdOuDados,
        role: 'DiretorGeral',
        cargo: 'Diretor Geral',
        password: dadosOuSenha || escolaIdOuDados.password || '123456',
        statusConta: 'Ativa',
        ativo: true
      } as Funcionario;
    }
    dbService.salvarFuncionario(f);
    setFuncionarios(dbService.obterFuncionarios());
    setLogs(dbService.obterLogs());
    return f;
  };

  const handleRedefinirSenhaDiretor = (funcionarioId: string, novaSenha: string) => {
    dbService.redefinirSenhaFuncionario(funcionarioId, novaSenha);
    setFuncionarios(dbService.obterFuncionarios());
    setLogs(dbService.obterLogs());
  };

  const handleSelecionarEscolaParaInspecao = (escolaId: string) => {
    handleSelectEscola(escolaId);
    setActiveTab('dashboard');
  };

  // Handlers de Login / Logout
  const handleLogin = (user: Funcionario, escolaSelecionada: Escola, anoSelecionado: string) => {
    dbService.setCurrentUser(user);
    setAuthenticatedUser(user);
    dbService.setEscolaAtiva(escolaSelecionada.id);
    dbService.setAnoLectivoActivo(anoSelecionado);
    setEscola(escolaSelecionada);
    setIsAuthenticated(true);
    localStorage.setItem('sge_authenticated', 'true');
    setActiveTab('dashboard');
    setLogs(dbService.obterLogs());
  };

  const handleLogout = () => {
    dbService.setCurrentUser(null);
    setAuthenticatedUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('sge_authenticated');
  };

  // Handler de Atualização de Perfil pelo próprio Usuário
  const handleSalvarPerfil = (perfilAtualizado: Funcionario) => {
    dbService.salvarFuncionario(perfilAtualizado);
    dbService.setCurrentUser(perfilAtualizado);
    setAuthenticatedUser(perfilAtualizado);
    setFuncionarios(dbService.obterFuncionarios());
    setLogs(dbService.obterLogs());
  };

  // Handlers de dados gerais
  const handleSalvarEscola = (escolaAtualizada: Escola) => {
    dbService.salvarEscola(escolaAtualizada);
    setEscola(escolaAtualizada);
    setEscolas(dbService.getEscolas());
  };

  const handleSalvarTurma = (turma: Turma) => {
    dbService.salvarTurma(turma);
    setTurmas(dbService.obterTurmas());
  };

  const handleEliminarTurma = (turmaId: string) => {
    dbService.eliminarTurma(turmaId);
    setTurmas(dbService.obterTurmas());
  };

  const handleSalvarDisciplina = (disc: Disciplina) => {
    dbService.salvarDisciplina(disc);
    setDisciplinas(dbService.obterDisciplinas());
  };

  const handleEliminarDisciplina = (discId: string) => {
    dbService.eliminarDisciplina(discId);
    setDisciplinas(dbService.obterDisciplinas());
  };

  const handleSalvarAtribuicao = (atrib: any) => {
    dbService.salvarAtribuicao(atrib);
    setAtribuicoes(dbService.obterAtribuicoes());
  };

  const handleRemoverAtribuicao = (id: string) => {
    dbService.removerAtribuicao(id);
    setAtribuicoes(dbService.obterAtribuicoes());
  };

  const handleSalvarJuri = (juri: ComissaoJuri) => {
    dbService.salvarJuri(juri);
    setJuris(dbService.obterJuris());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
  };

  const handleEliminarJuri = (juriId: string) => {
    dbService.excluirJuri(juriId);
    setJuris(dbService.obterJuris());
  };

  const handleSalvarAluno = (aluno: Aluno) => {
    dbService.salvarAluno(aluno);
    setAlunos(dbService.obterAlunos());
  };

  const handleExcluirAluno = (alunoId: string) => {
    dbService.excluirAluno(alunoId);
    setAlunos(dbService.obterAlunos());
  };

  const handleSalvarTipoAvaliacao = (tipo: TipoAvaliacaoConfig) => {
    dbService.salvarTipoAvaliacao(tipo);
    setTiposAvaliacao(dbService.obterTiposAvaliacao());
  };

  const handleSalvarRegraMAC = (regra: RegraCalculoMAC) => {
    dbService.salvarRegraMAC(regra);
    setRegrasMAC(dbService.obterRegrasMAC());
  };

  const handleSalvarAvaliacao = (avaliacao: AvaliacaoCriada) => {
    dbService.salvarAvaliacao(avaliacao);
    setAvaliacoes(dbService.obterAvaliacoes());
  };

  const handleExcluirAvaliacao = (avaliacaoId: string) => {
    dbService.excluirAvaliacao(avaliacaoId);
    setAvaliacoes(dbService.obterAvaliacoes());
  };

  const handleSalvarNota = (nota: NotaEstudante) => {
    dbService.salvarNota(nota);
    setNotas(dbService.obterNotas());
  };

  const handleSalvarNotaConsolidada = (notaCons: NotaTrimestralConsolidada) => {
    dbService.salvarNotaConsolidada(notaCons);
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
  };

  const handleSalvarSolicitacao = (solicitacao: SolicitacaoAlteracaoNota) => {
    dbService.salvarSolicitacao(solicitacao);
    setSolicitacoes(dbService.obterSolicitacoes());
  };

  const handleSalvarFuncionario = (func: Funcionario) => {
    dbService.salvarFuncionario(func);
    setFuncionarios(dbService.obterFuncionarios());
  };

  const handleSalvarRegistoAssiduidade = (registo: RegistoAssiduidade) => {
    dbService.salvarAssiduidade(registo);
    setAssiduidade(dbService.obterAssiduidade());
  };

  const handleAtualizarStatusFuncionario = (id: string, status: any, motivo?: string) => {
    dbService.atualizarStatusContaFuncionario(id, status, motivo);
    setFuncionarios(dbService.obterFuncionarios());
  };

  const handleEliminarFuncionario = (id: string) => {
    dbService.eliminarFuncionario(id);
    setFuncionarios(dbService.obterFuncionarios());
    setEscolas(dbService.getEscolas());
    setEscola(dbService.getEscolaAtiva());
    setLogs(dbService.obterLogs());
  };

  const handleEnviarMensagem = (msg: Mensagem) => {
    dbService.salvarMensagem(msg);
    setMensagens(dbService.obterMensagens());
  };

  const handleAdicionarLivro = (livro: DocumentoBiblioteca) => {
    dbService.salvarLivro(livro);
    setLivros(dbService.obterLivros());
  };

  const handleLimparLogs = () => {
    dbService.limparLogs();
    setLogs(dbService.obterLogs());
  };

  const handleRestaurarBackup = (jsonStr: string) => {
    dbService.restaurarBackupJSON(jsonStr);
    setEscolas(dbService.getEscolas());
    setEscola(dbService.obterEscola());
    setTurmas(dbService.obterTurmas());
    setDisciplinas(dbService.obterDisciplinas());
    setFuncionarios(dbService.obterFuncionarios());
    setAlunos(dbService.obterAlunos());
    setTiposAvaliacao(dbService.obterTiposAvaliacao());
    setRegrasMAC(dbService.obterRegrasMAC());
    setAvaliacoes(dbService.obterAvaliacoes());
    setNotas(dbService.obterNotas());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
    setSolicitacoes(dbService.obterSolicitacoes());
    setAssiduidade(dbService.obterAssiduidade());
    setMensagens(dbService.obterMensagens());
    setLivros(dbService.obterLivros());
    setLogs(dbService.obterLogs());
    setJuris(dbService.obterJuris());
    setAnosLectivos(dbService.getAnosLectivos());
  };

  // Handlers de Apoio Técnico Emergencial (Admin Geral assumindo o papel de Diretor Geral)
  const handleIniciarApoioTecnico = (escolaId: string, solicitacaoId: string) => {
    const esc = escolas.find(e => e.id === escolaId);
    if (!esc) return;

    dbService.setEscolaAtiva(escolaId);
    setEscola(esc);

    setModoApoioTecnico({
      escolaId,
      solicitacaoId,
      escolaNome: esc.nomeOficial,
      escolaOriginalId: escola.id
    });

    try {
      dbService.responderSolicitacaoApoioTecnico(
        solicitacaoId,
        'Em_Atendimento',
        currentUser.nomeCompleto,
        `Sessão de intervenção e apoio técnico iniciada diretamente pelo Administrador Geral às ${new Date().toLocaleTimeString('pt-AO')}.`
      );
    } catch {}

    setActiveTab('dashboard');
  };

  const handleEncerrarModoApoio = () => {
    if (modoApoioTecnico?.solicitacaoId) {
      try {
        dbService.responderSolicitacaoApoioTecnico(
          modoApoioTecnico.solicitacaoId,
          'Concluido',
          currentUser.nomeCompleto,
          `Intervenção técnica ministerial concluída com sucesso às ${new Date().toLocaleTimeString('pt-AO')}.`
        );
      } catch {}
    }

    const originalEscolaId = modoApoioTecnico?.escolaOriginalId;
    setModoApoioTecnico(null);

    if (originalEscolaId) {
      const escOrig = escolas.find(e => e.id === originalEscolaId);
      if (escOrig) {
        dbService.setEscolaAtiva(originalEscolaId);
        setEscola(escOrig);
      }
    }
    setActiveTab('apoio_tecnico');
  };

  const handleMarcarMensagemLida = (id: string) => {
    dbService.marcarMensagemLida(id);
    setMensagens(dbService.obterMensagens());
  };

  const handleMarcarTodasMensagensLidas = () => {
    dbService.marcarTodasMensagensLidas(escola.id);
    setMensagens(dbService.obterMensagens());
  };

  // Verificação de permissão de acesso à aba ativa (inclui apoio técnico para Admin Geral, delegações financeiras e comissões de júri)
  const isMembroJuriAtivo = juris.some(j => 
    j.escolaId === escola.id && 
    j.estado !== 'Encerrada' && 
    (j.membros?.some(m => m.usuarioId === currentUser.id) || j.presidenteId === currentUser.id || j.secretarioId === currentUser.id)
  );

  const temSessaoApoioAdminGeral = Boolean(modoApoioTecnico) || (currentUser.role === 'AdminGeral' && Boolean(escola.sessaoApoioTecnicoAtiva));
  const temDelegacaoCobranca = dbService.getDelegacoesCobranca(escola.id).some(d => d.funcionarioId === currentUser.id && d.ativo);

  const isAbaPermitida = 
    Boolean(modoApoioTecnico)
      ? true // No modo de apoio técnico o Administrador Geral possui acesso irrestrito a todos os menus do Diretor Geral da escola
      : (currentUser.role === 'AdminGeral' && activeTab === 'comissao_juri'
        ? false // Administrador geral não precisa ver comissões de júri
        : (temSessaoApoioAdminGeral // Admin Geral em apoio técnico tem acesso aos outros módulos
          || (activeTab === 'pagamentos' && temDelegacaoCobranca) // Acesso por delegação financeira do Diretor
          || (activeTab === 'comissao_juri' && isMembroJuriAtivo)
          || allowedTabsPorRole[effectiveUser.role]?.includes(activeTab)));

  // Ecrã de Verificação Soberana Inicial contra o Firebase
  if (verificandoAdminOnline) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              REPÚBLICA DE ANGOLA · MINISTÉRIO DA EDUCAÇÃO
            </p>
            <h2 className="text-sm font-bold text-white">
              SGE-NG — Sistema de Gestão Escolar
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            A verificar existência de conta do Administrador Geral no Firestore online...
          </p>
        </div>
      </div>
    );
  }

  // 1. Verificação Primária: Se verificado que não existe conta do Administrador Geral no Firebase online (nem local),
  // a página de configuração DEVE aparecer ANTES da página de login.
  if (!temAdminGeral) {
    return (
      <SystemInitialSetupView
        onSetupConcluido={(novoAdmin) => {
          setTemAdminGeral(true);
          setAuthenticatedUser(novoAdmin);
          setIsAuthenticated(true);
          localStorage.setItem('sge_authenticated', 'true');
          setFuncionarios(dbService.obterFuncionarios());
          setEscolas(dbService.getEscolas());
          setEscola(dbService.getEscolaAtiva());
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // Ecrã Oficial de Autenticação se não houver sessão ativa (virgem e sem secção de configuração do administrador)
  if (!isAuthenticated) {
    return (
      <LoginView
        escolas={escolas}
        selectedEscola={escola}
        onSelectEscola={handleSelectEscola}
        anosLectivos={anosLectivos}
        selectedAno={escola.anoLectivoActivo || '2025/2026'}
        onSelectAno={handleSelectAnoLectivo}
        funcionarios={funcionarios}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header Superior Seguro */}
      <Header
        escola={escola}
        escolas={escolas}
        onSelectEscola={handleSelectEscola}
        anosLectivos={anosLectivos}
        onSelectAnoLectivo={handleSelectAnoLectivo}
        onSelectTrimestre={handleSelectTrimestre}
        currentUser={effectiveUser}
        integrity={integrity}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenPublicPortal={() => setActiveTab('alunos')}
        onNavigateToPerfil={() => setActiveTab('meu_perfil')}
        onNavigateToComunicacao={() => setActiveTab('comunicacao')}
        onLogout={handleLogout}
        onOpenSecurityEngine={() => setShowSecurityModal(true)}
      />

      {/* Banner de Sessão de Apoio Técnico Ativa (Admin Geral no papel de Diretor Geral da Escola) */}
      {(modoApoioTecnico || (currentUser.role === 'AdminGeral' && Boolean(escola.sessaoApoioTecnicoAtiva))) && (
        <div className="bg-gradient-to-r from-amber-600 via-indigo-950 to-slate-900 text-white px-4 py-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-30 no-print border-b-2 border-amber-400 sticky top-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-300/40 shrink-0">
              <LifeBuoy className="h-5 w-5 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                  🛠️ Sessão de Apoio Técnico Ativa · Acesso Direto como Diretor Geral
                </span>
                <span className="text-[10px] bg-amber-400 text-gray-950 px-2 py-0.5 rounded-full font-black">
                  SEM NECESSIDADE DE CREDENCIAIS
                </span>
              </div>
              <span className="text-xs text-amber-100 block mt-0.5">
                Instituição: <strong>{modoApoioTecnico?.escolaNome || escola.nomeOficial}</strong> · Menus pedagógicos, turmas, pautas e configurações desbloqueados.
              </span>
            </div>
          </div>
          <button
            onClick={handleEncerrarModoApoio}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs rounded-xl shadow-md transition-all shrink-0 self-end sm:self-auto cursor-pointer flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-950" />
            <span>Encerrar Apoio & Retornar ao DTI</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar de Navegação Oficial categorizada por grupos e RBAC */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          userRole={effectiveUser.role}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentUser={effectiveUser}
          onLogout={handleLogout}
        />

        {/* Content Area com Proteção de Rotas RBAC */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {!isAbaPermitida ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center space-y-3 max-w-lg mx-auto mt-12">
              <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-amber-900">Acesso Restrito ao Perfil</h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                O seu perfil de acesso atual (<strong>{currentUser.cargo || currentUser.role}</strong>) não possui permissões administrativas para trabalhar com este módulo.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao Painel Principal</span>
              </button>
            </div>
          ) : (
            <>
              {/* 1. PRINCIPAL */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  escola={escola}
                  escolas={escolas}
                  currentUser={currentUser}
                  alunos={alunos}
                  funcionarios={funcionarios}
                  turmas={turmas}
                  notasConsolidadas={notasConsolidadas}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenSecurityModal={() => setShowSecurityModal(true)}
                />
              )}

              {/* 2. ACADÊMICO (Ano Letivo, Classes, Cursos, Disciplinas, Turmas, Turnos) */}
              {(activeTab === 'ano_lectivo' || activeTab === 'classes' || activeTab === 'cursos' || activeTab === 'disciplinas' || activeTab === 'turmas' || activeTab === 'turnos' || activeTab === 'academico') && (
                <AcademicManagementView
                  escola={escola}
                  turmas={turmas}
                  disciplinas={disciplinas}
                  atribuicoes={atribuicoes}
                  funcionarios={funcionarios}
                  juris={juris}
                  onSalvarEscola={handleSalvarEscola}
                  onSalvarTurma={handleSalvarTurma}
                  onEliminarTurma={handleEliminarTurma}
                  onSalvarDisciplina={handleSalvarDisciplina}
                  onEliminarDisciplina={handleEliminarDisciplina}
                  onSalvarAtribuicao={handleSalvarAtribuicao}
                  onRemoverAtribuicao={handleRemoverAtribuicao}
                  onSalvarJuri={handleSalvarJuri}
                  onNavigateToJury={() => setActiveTab('comissao_juri')}
                  initialSubTab={
                    activeTab === 'classes' ? 'classes' :
                    activeTab === 'cursos' ? 'cursos' :
                    activeTab === 'disciplinas' ? 'disciplinas' :
                    activeTab === 'turmas' ? 'turmas' :
                    activeTab === 'turnos' ? 'turnos' : 'anos'
                  }
                  onAnoLectivoAlterado={handleSelectAnoLectivo}
                />
              )}

              {/* CALENDÁRIO ESCOLAR OFICIAL DO MINISTÉRIO DA EDUCAÇÃO (MED ANGOLA) */}
              {activeTab === 'calendario_escolar' && (
                <SchoolCalendarView
                  escola={escola}
                  currentUser={currentUser}
                />
              )}

              {/* GESTÃO DE HORÁRIOS ESCOLARES SEM CONFLITO & NOTIFICAÇÕES A PROFESSORES */}
              {activeTab === 'horarios' && (
                <ScheduleTimetableView
                  escola={escola}
                  currentUser={currentUser}
                  turmas={turmas}
                  disciplinas={disciplinas}
                  funcionarios={funcionarios}
                />
              )}

              {/* FICHAS DE PRESENÇAS DOS ALUNOS (DOWNLOAD & IMPRESSÃO OFICIAL) */}
              {activeTab === 'presencas' && (
                <StudentAttendanceReportView
                  escola={escola}
                  currentUser={currentUser}
                  turmas={turmas}
                  alunos={alunos}
                  disciplinas={disciplinas}
                  funcionarios={funcionarios}
                />
              )}

              {/* PASSES ESCOLARES (8 POR FOLHA A4 & CONFIGURADOR DE ELEMENTOS/CORES) */}
              {activeTab === 'passes_escolares' && (
                <StudentPassesView
                  escola={escola}
                  alunos={alunos}
                  turmas={turmas}
                  currentUser={currentUser}
                  onSalvarEscola={handleSalvarEscola}
                />
              )}

              {/* 3. GESTÃO: Alunos */}
              {(activeTab === 'alunos' || activeTab === 'estudantes') && (
                <StudentsView
                  alunos={alunos}
                  turmas={turmas}
                  onSalvarAluno={handleSalvarAluno}
                  onExcluirAluno={handleExcluirAluno}
                />
              )}

              {/* 3. GESTÃO: Professores, RH */}
              {(activeTab === 'professores' || activeTab === 'rh') && (
                <HumanResourcesView
                  escola={escola}
                  currentUser={currentUser}
                  funcionarios={funcionarios}
                  assiduidade={assiduidade}
                  onSalvarFuncionario={handleSalvarFuncionario}
                  onSalvarRegistoAssiduidade={handleSalvarRegistoAssiduidade}
                  onAtualizarStatusFuncionario={handleAtualizarStatusFuncionario}
                  onRedefinirSenhaFuncionario={handleRedefinirSenhaDiretor}
                  onEliminarFuncionario={handleEliminarFuncionario}
                />
              )}

              {/* 3.0 PRESIDÊNCIA & DIREÇÃO EXECUTIVA (DESPACHOS, ATAS & DECISÃO) */}
              {activeTab === 'direcao' && (
                <ExecutiveDirectionView
                  escola={escola}
                  currentUser={currentUser}
                  funcionarios={funcionarios}
                  turmas={turmas}
                  alunos={alunos}
                  onSalvarEscola={handleSalvarEscola}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {/* 3. GESTÃO: Coordenação (MAC / Avaliações) */}
              {(activeTab === 'coordenacao' || activeTab === 'avaliacoes') && (
                <EvaluationMacView
                  escola={escola}
                  currentUser={currentUser}
                  turmas={turmas}
                  disciplinas={disciplinas}
                  alunos={alunos}
                  tiposAvaliacao={tiposAvaliacao}
                  regrasMAC={regrasMAC}
                  avaliacoes={avaliacoes}
                  notas={notas}
                  notasConsolidadas={notasConsolidadas}
                  solicitacoes={solicitacoes}
                  onSalvarTipoAvaliacao={handleSalvarTipoAvaliacao}
                  onSalvarRegraMAC={handleSalvarRegraMAC}
                  onSalvarAvaliacao={handleSalvarAvaliacao}
                  onExcluirAvaliacao={handleExcluirAvaliacao}
                  onSalvarNota={handleSalvarNota}
                  onSalvarNotaConsolidada={handleSalvarNotaConsolidada}
                  onSalvarSolicitacao={handleSalvarSolicitacao}
                />
              )}

              {/* 3.1 GESTÃO & DELIBERAÇÃO: Comissão de Júri Oficial do SGE */}
              {activeTab === 'comissao_juri' && (
                <JuryCommissionView
                  escola={escola}
                  currentUser={currentUser}
                  comissoes={juris}
                  turmas={turmas}
                  disciplinas={disciplinas}
                  alunos={alunos}
                  notasConsolidadas={notasConsolidadas}
                  atribuicoes={atribuicoes}
                  funcionarios={funcionarios}
                  onSalvarComissao={handleSalvarJuri}
                  onEliminarComissao={handleEliminarJuri}
                  onVoltarParaPainel={() => setActiveTab('dashboard')}
                />
              )}

              {/* 4. DOCUMENTOS: Declarações, Certificados, Pautas, Boletins, Termos de Exame */}
              {(activeTab === 'declaracoes' || activeTab === 'certificados' || activeTab === 'pautas' || activeTab === 'boletins' || activeTab === 'termos_exame' || activeTab === 'documentos') && (
                <PrintingDocumentsView
                  escola={escola}
                  alunos={alunos}
                  turmas={turmas}
                  disciplinas={disciplinas}
                  notasConsolidadas={notasConsolidadas}
                  initialDocType={
                    activeTab === 'pautas' ? 'pautas' :
                    activeTab === 'certificados' ? 'certificado_ciclo' :
                    activeTab === 'declaracoes' ? 'declaracao_notas' :
                    activeTab === 'boletins' ? 'boletim_oficial' :
                    activeTab === 'termos_exame' ? 'termos_exame' : undefined
                  }
                />
              )}

              {/* 5. FINANCEIRO: Pagamentos e Relatórios Financeiros */}
              {(activeTab === 'pagamentos' || activeTab === 'relatorios_financeiros' || activeTab === 'financeiro') && (
                <AdministrativeFinanceView
                  escola={escola}
                  currentUser={currentUser}
                  alunos={alunos}
                  turmas={turmas}
                  initialSubTab={
                    activeTab === 'pagamentos' ? 'pagamentos' :
                    activeTab === 'relatorios_financeiros' ? 'relatorios' : 'visao_geral'
                  }
                />
              )}

              {/* 6. OUTROS: Biblioteca */}
              {(activeTab === 'biblioteca' || activeTab === 'comunicacao') && (
                <CommunicationLibraryView
                  escola={escola}
                  currentUser={effectiveUser}
                  funcionarios={funcionarios}
                  mensagens={mensagens}
                  livros={livros}
                  onEnviarMensagem={handleEnviarMensagem}
                  onAdicionarLivro={handleAdicionarLivro}
                  onMarcarComoLida={handleMarcarMensagemLida}
                  onMarcarTodasComoLidas={handleMarcarTodasMensagensLidas}
                />
              )}

              {/* 6. OUTROS: Património Escolar */}
              {activeTab === 'patrimonio' && (
                <PatrimonyView
                  escola={escola}
                  currentUser={effectiveUser}
                />
              )}

              {/* 7. SISTEMA: Usuários e Perfis, Configurações, Auditoria / Logs, Backup / Restauro */}
              {(activeTab === 'usuarios_perfis' || activeTab === 'configuracoes' || activeTab === 'auditoria_logs' || activeTab === 'auditoria' || activeTab === 'backup_restauro' || activeTab === 'sistema' || activeTab === 'formulas_notas') && (
                <SystemAuditBackupView
                  escola={escola}
                  currentUser={effectiveUser}
                  logs={logs}
                  alunos={alunos}
                  funcionarios={funcionarios}
                  onLimparLogs={handleLimparLogs}
                  onRestaurarBackup={handleRestaurarBackup}
                  onAtualizarEscola={handleSalvarEscola}
                  onSalvarFuncionario={handleSalvarFuncionario}
                  onEliminarFuncionario={handleEliminarFuncionario}
                  initialTab={
                    activeTab === 'formulas_notas' ? 'formulas_notas' :
                    activeTab === 'usuarios_perfis' ? 'usuarios_perfis' :
                    activeTab === 'configuracoes' ? 'interruptores_configuracao' :
                    (activeTab === 'auditoria_logs' || activeTab === 'auditoria') ? 'auditoria' :
                    activeTab === 'backup_restauro' ? 'backup_restauracao' : 'backup_restauracao'
                  }
                />
              )}

              {/* 7. SISTEMA: Apoio Técnico DTI */}
              {activeTab === 'apoio_tecnico' && (
                <TechnicalSupportView
                  escola={escola}
                  escolas={escolas}
                  currentUser={currentUser}
                  onEscolaInspecionada={(escId: string) => {
                    handleSelectEscola(escId);
                    setActiveTab('dashboard');
                  }}
                  onSelecionarEscolaParaApoio={(escId: string) => {
                    handleSelectEscola(escId);
                    setActiveTab('dashboard');
                  }}
                  onIniciarApoioTecnico={handleIniciarApoioTecnico}
                />
              )}

              {/* 8. CONTA & PERFIL: Meu Perfil */}
              {activeTab === 'meu_perfil' && (
                <UserProfileView
                  currentUser={currentUser}
                  escola={escola}
                  onSalvarPerfil={handleSalvarPerfil}
                />
              )}

              {/* Submódulos Administrativos Especiais */}
              {activeTab === 'admin_escolas' && (
                <AdminGlobalSchoolsView
                  escolas={escolas}
                  funcionarios={funcionarios}
                  alunos={alunos}
                  turmas={turmas}
                  onCriarEscola={handleCriarEscola}
                  onAtualizarEscola={handleSalvarEscola}
                  onSuspenderEscola={handleSuspenderEscola}
                  onReativarEscola={handleReativarEscola}
                  onEliminarEscola={handleEliminarEscola}
                  onCriarOuAtualizarDiretor={handleCriarOuAtualizarDiretor}
                  onRedefinirSenhaDiretor={handleRedefinirSenhaDiretor}
                  onSelecionarEscolaParaInspecao={handleSelecionarEscolaParaInspecao}
                  onEliminarFuncionario={handleEliminarFuncionario}
                />
              )}

              {activeTab === 'arquitetura' && (
                <ArchitectureDocsView />
              )}
            </>
          )}
        </main>
      </div>

      {/* Rodapé Oficial da Aplicação com Copyright, Ano Atual e Desenvolvedor Dite Zola NG */}
      <Footer variant="light" />

      {/* Modal de Configuração Inicial - Apenas chamado antes do primeiro cadastro */}
      <InitialSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSaveSetup={handleSaveSetup}
        escolasExistentes={escolas}
      />

      {/* Motor de Segurança & Criptografia AES-256 em Tempo Real */}
      <RealtimeSecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onAbrirSetupInicial={() => setTemAdminGeral(false)}
      />
    </div>
  );
}
