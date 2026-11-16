import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { securityEngine } from './services/securityEngine';
import { cryptoService } from './services/cryptoService';
import { firebaseSyncEngine } from './services/firebaseSyncEngine';
import { offlineStorage } from './services/offlineStorage';
import { LoginView } from './components/LoginView';
import { Footer } from './components/Footer';
import { SyncProgressBarAndNotification } from './components/SyncProgressBarAndNotification';
import { PWAInstallNotification } from './components/PWAInstallNotification';
import { notificationService } from './services/notificationService';
import { ShieldAlert, ArrowLeft, LifeBuoy, LogOut } from 'lucide-react';

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
import { UserProfileView } from './components/UserProfileView';
import { TechnicalSupportView } from './components/TechnicalSupportView';
import { PatrimonyView } from './components/PatrimonyView';
import { JuryCommissionView } from './components/JuryCommissionView';
import { ScheduleTimetableView } from './components/ScheduleTimetableView';
import { StudentAttendanceReportView } from './components/StudentAttendanceReportView';
import { StudentPassesView } from './components/StudentPassesView';
import { ExecutiveDirectionView } from './components/ExecutiveDirectionView';
import { SchoolCalendarView } from './components/SchoolCalendarView';
import { ReportsView } from './components/ReportsView';
import { StatisticsView } from './components/StatisticsView';
import { GuidedTourModal } from './components/GuidedTourModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTabRaw] = useState<NavTab>(() => {
    try {
      const isAuth = typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';
      if (!isAuth) return 'dashboard';
      const savedTab = localStorage.getItem('sge_active_tab') as NavTab;
      if (savedTab) return savedTab;
      return 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const setActiveTab = useCallback((tab: NavTab) => {
    setActiveTabRaw(tab);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sge_active_tab', tab);
      }
    } catch {}
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [integrity, setIntegrity] = useState<SystemIntegrityStatus>(verificarIntegridadeSistema());
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showTourModal, setShowTourModal] = useState<boolean>(false);
  const [temAdminGeral, setTemAdminGeral] = useState<boolean>(() => dbService.temAdminGeral());
  const [verificandoAdminOnline, setVerificandoAdminOnline] = useState<boolean>(false);
  const [mostrarSetupInicial, setMostrarSetupInicial] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [firebasePermissaoNegada, setFirebasePermissaoNegada] = useState<boolean>(() => firebaseSyncEngine.isPermissaoNegada());
  const [dispensarAvisoRegras, setDispensarAvisoRegras] = useState<boolean>(false);

  // Estado Multi-Escola & Multi-Ano Lectivo
  const [escolas, setEscolas] = useState<Escola[]>(() => dbService.getEscolas());
  const [escola, setEscola] = useState<Escola>(() => dbService.getEscolaAtiva());
  const [anosLectivos, setAnosLectivos] = useState<string[]>(() => dbService.getAnosLectivos(dbService.getEscolaAtiva()?.id));

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

  const currentUser: Funcionario = authenticatedUser || dbService.getCurrentUser();

  // Modo de Apoio Técnico Emergencial (Admin Geral assumindo o papel de Diretor Geral)
  const [modoApoioTecnico, setModoApoioTecnico] = useState<{
    escolaId: string;
    solicitacaoId?: string;
    escolaNome: string;
    escolaOriginalId?: string;
  } | null>(null);

  const modoApoioAtivo = useMemo(() => {
    if (modoApoioTecnico) return modoApoioTecnico;
    if (currentUser.role === 'AdminGeral' && escola?.sessaoApoioTecnicoAtiva?.dataInicio) {
      let escolaOriginalId: string | undefined;
      try {
        escolaOriginalId = localStorage.getItem('sge_apoio_escola_original_id') || undefined;
      } catch {}
      return {
        escolaId: escola.id,
        solicitacaoId: escola.sessaoApoioTecnicoAtiva.solicitacaoId,
        escolaNome: escola.nomeOficial,
        escolaOriginalId
      };
    }
    return null;
  }, [modoApoioTecnico, currentUser.role, escola]);

  const effectiveUser: Funcionario = useMemo(() => {
    if (modoApoioAtivo) {
      return {
        ...currentUser,
        role: 'DiretorGeral' as UserRole,
        cargo: `Diretor Geral (Apoio Técnico DTI/MED)`,
        escolaId: modoApoioAtivo.escolaId,
      };
    }
    return currentUser;
  }, [modoApoioAtivo, currentUser]);

  // Função centralizada para recarregar todos os dados do banco local após sincronização com o Firebase
  const recarregarDados = useCallback(() => {
    setEscolas(dbService.getEscolas());
    const escAtiva = dbService.getEscolaAtiva();
    setEscola(escAtiva);
    const funcsFrescos = dbService.getFuncionariosBruto();
    setFuncionarios(dbService.obterFuncionarios());
    setTurmas(dbService.obterTurmas());
    setAlunos(dbService.obterAlunos());
    setDisciplinas(dbService.obterDisciplinas());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
    setAtribuicoes(dbService.obterAtribuicoes());
    setJuris(dbService.obterJuris());
    setNotas(dbService.obterNotas());
    setAvaliacoes(dbService.obterAvaliacoes());
    setAssiduidade(dbService.obterAssiduidade());
    setSolicitacoes(dbService.obterSolicitacoes());
    setMensagens(dbService.obterMensagens());
    setLivros(dbService.obterLivros());
    setLogs(dbService.obterLogs());
    setAnosLectivos(dbService.getAnosLectivos(escAtiva?.id));
    setTiposAvaliacao(dbService.obterTiposAvaliacao());
    setRegrasMAC(dbService.obterRegrasMAC());

    // Garantir que a sessão e perfil do utilizador autenticado refletem imediatamente alterações remotas (ex.: fotografia ou reatribuição de escola)
    const userLogado = dbService.getCurrentUser();
    if (userLogado && userLogado.id && userLogado.nomeCompleto) {
      const remotoMaisRecente = funcsFrescos.find(f => f.id === userLogado.id);
      if (remotoMaisRecente) {
        const tsLocal = userLogado.atualizadoEm ? Date.parse(userLogado.atualizadoEm) || 0 : 0;
        const tsRemoto = remotoMaisRecente.atualizadoEm ? Date.parse(remotoMaisRecente.atualizadoEm) || 0 : 0;
        if (tsRemoto >= tsLocal && JSON.stringify(remotoMaisRecente) !== JSON.stringify(userLogado)) {
          dbService.setCurrentUser(remotoMaisRecente);
          setAuthenticatedUser(remotoMaisRecente);
          if (
            remotoMaisRecente.role !== 'AdminGeral' &&
            remotoMaisRecente.escolaId &&
            remotoMaisRecente.escolaId !== 'todas' &&
            remotoMaisRecente.escolaId !== escAtiva?.id
          ) {
            dbService.setEscolaAtiva(remotoMaisRecente.escolaId);
            const novaEscAtiva = dbService.getEscolaAtiva();
            setEscola(novaEscAtiva);
            setAnosLectivos(dbService.getAnosLectivos(novaEscAtiva?.id));
          }
          return;
        }
      }
      setAuthenticatedUser(userLogado);
    }
  }, []);

  // Listener para status online/offline e verificação rápida do Administrador Geral no Firebase
  useEffect(() => {
    let ativo = true;

    const verificarAdmin = async () => {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true') {
        if (ativo) {
          setMostrarSetupInicial(false);
          setVerificandoAdminOnline(false);
        }
        return;
      }

      // Se já existe Administrador Geral no dispositivo, nunca bloqueia nem mostra setup inicial
      if (dbService.temAdminGeral()) {
        if (ativo) {
          setTemAdminGeral(true);
          setMostrarSetupInicial(false);
          setVerificandoAdminOnline(false);
        }
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (ativo) {
          setMostrarSetupInicial(false);
          setVerificandoAdminOnline(false);
        }
        return;
      }

      try {
        const res = await dbService.verificarAdminGeralOnline(1500);
        if (ativo) {
          setTemAdminGeral(res.existe);
          setMostrarSetupInicial(res.deveMostrarSetupInicial);
          if (res.existe) {
            setFuncionarios(dbService.obterFuncionarios());
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar Administrador Geral no Firebase:', err);
        if (ativo) {
          setMostrarSetupInicial(false);
        }
      } finally {
        if (ativo) {
          setVerificandoAdminOnline(false);
        }
      }
    };

    verificarAdmin();

    // Salvaguarda máxima de 1.5s para arranque imediato mesmo com rede lenta
    const timer = setTimeout(() => {
      if (ativo) {
        setVerificandoAdminOnline(false);
        setMostrarSetupInicial(false);
      }
    }, 1500);

    // Arranque em duas fases: bootstrap leve no ecrã de login e sincronização completa quando autenticado
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const jaAutenticado =
        typeof localStorage !== 'undefined' && localStorage.getItem('sge_authenticated') === 'true';

      const promessaSync = jaAutenticado
        ? firebaseSyncEngine.iniciarCicloInicialOnline()
        : firebaseSyncEngine.iniciarCicloBootstrapLeve();

      promessaSync.then(() => {
        if (ativo) {
          recarregarDados();
          if (!dbService.temAdminGeral()) {
            verificarAdmin();
          } else {
            setTemAdminGeral(true);
            setMostrarSetupInicial(false);
            setVerificandoAdminOnline(false);
          }
        }
      });
    } else {
      // Offline: garantir hidratação imediata do IndexedDB local para operação ininterrupta
      offlineStorage.hidratarArmazenamentoDoIndexedDB().then((restaurado) => {
        if (ativo && restaurado) {
          recarregarDados();
          if (dbService.temAdminGeral()) {
            setTemAdminGeral(true);
            setMostrarSetupInicial(false);
            setVerificandoAdminOnline(false);
          }
        }
      });
    }

    const handleRemoteUpdate = () => {
      if (!ativo) return;
      recarregarDados();
      const escAtiva = dbService.getEscolaAtiva();
      const usrAtivo = dbService.getCurrentUser();
      if (usrAtivo && usrAtivo.id) {
        notificationService.verificarNovidadesRemotas(escAtiva.id, usrAtivo);
      }
      if (dbService.temAdminGeral()) {
        setTemAdminGeral(true);
        setMostrarSetupInicial(false);
        setVerificandoAdminOnline(false);
      }
    };
    window.addEventListener('sge_dados_atualizados_remoto', handleRemoteUpdate);

    // Inicializar Service Worker de Notificações e escuta de navegação por clique em push/alerta
    notificationService.inicializarServiceWorker();
    const unsubNavNotif = notificationService.subscreverNavegacao(({ tab, subTab }) => {
      if (!ativo) return;
      setActiveTab(tab as NavTab);
      if (subTab === 'solicitacoes') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sge_open_evaluation_subtab', { detail: 'solicitacoes' }));
        }, 80);
      } else if (subTab === 'biblioteca' || tab === 'biblioteca') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sge_open_comm_subtab', { detail: 'biblioteca' }));
        }, 80);
      }
    });

    const handleOnline = () => {
      setIntegrity(verificarIntegridadeSistema());
      if (!dbService.temAdminGeral()) {
        verificarAdmin();
      }
    };
    const handleOffline = () => {
      setIntegrity(verificarIntegridadeSistema());
      if (ativo) {
        setMostrarSetupInicial(false);
        setVerificandoAdminOnline(false);
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubStatus = firebaseSyncEngine.subscreverStatus((status) => {
      if (status.permissaoNegada) {
        setFirebasePermissaoNegada(true);
      }
    });

    return () => {
      ativo = false;
      clearTimeout(timer);
      unsubStatus();
      unsubNavNotif();
      window.removeEventListener('sge_dados_atualizados_remoto', handleRemoteUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [recarregarDados, setActiveTab]);

  // Inicializar linha de base de notificações ao autenticar para detetar apenas novidades futuras
  useEffect(() => {
    if (isAuthenticated && escola?.id) {
      notificationService.inicializarBaselineRemoto(escola.id);
    }
  }, [isAuthenticated, escola?.id]);

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

  // Exibição automática do Tour Guiado para novos utilizadores após autenticação
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      try {
        const jaViuTour = localStorage.getItem(`sge_tour_completed_${currentUser.id || currentUser.role}`);
        if (jaViuTour !== 'true') {
          const timer = setTimeout(() => {
            setShowTourModal(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error('Erro ao ler estado do tour guiado:', err);
      }
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.role]);

  // Alternância Multi-Escola
  const handleSelectEscola = (escolaId: string) => {
    dbService.setEscolaAtiva(escolaId);
    const escolaAtiva = dbService.getEscolaAtiva();
    setEscola(escolaAtiva);
    setEscolas(dbService.getEscolas());
    setAnosLectivos(dbService.getAnosLectivos(escolaAtiva?.id));
    setTurmas(dbService.obterTurmas());
    setDisciplinas(dbService.obterDisciplinas());
    setAlunos(dbService.obterAlunos());
    setAtribuicoes(dbService.obterAtribuicoes());
    setAvaliacoes(dbService.obterAvaliacoes());
    setNotas(dbService.obterNotas());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
    setSolicitacoes(dbService.obterSolicitacoes());
    setAssiduidade(dbService.obterAssiduidade());
    setMensagens(dbService.obterMensagens());
    setLivros(dbService.obterLivros());
    setJuris(dbService.obterJuris());
    setFuncionarios(dbService.obterFuncionarios());
    setLogs(dbService.obterLogs());
  };

  // Alternância de Ano Lectivo Multi-Ano
  const handleSelectAnoLectivo = (ano: string) => {
    dbService.setAnoLectivoActivo(ano, escola?.id);
    const escolaAtiva = dbService.getEscolaAtiva();
    setEscola({ ...escolaAtiva, anoLectivoActivo: ano });
    setAnosLectivos(dbService.getAnosLectivos(escolaAtiva?.id));
    setTurmas(dbService.obterTurmas());
    setAlunos(dbService.obterAlunos());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
    setAtribuicoes(dbService.obterAtribuicoes());
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
      'historico_escolar',
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
      'formulas_notas',
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
    ],
    SubdirectorAdministrativo: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'historico_escolar',
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
      'comissao_juri',
      'relatorios',
      'estatisticas'
    ],
    SubdiretorAdministrativo: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'historico_escolar',
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
      'comissao_juri',
      'relatorios',
      'estatisticas'
    ],
    Professor: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'historico_escolar',
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
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
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
      'historico_escolar',
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
      'arquitetura',
      'relatorios',
      'estatisticas'
    ],
    Encarregado: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'boletins',
      'pagamentos',
      'meu_perfil',
      'estudantes',
      'comunicacao'
    ],
    SecretarioEscolar: [
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
      'historico_escolar',
      'declaracoes',
      'certificados',
      'pautas',
      'boletins',
      'passes_escolares',
      'termos_exame',
      'pagamentos',
      'relatorios_financeiros',
      'usuarios_perfis',
      'meu_perfil',
      'comunicacao',
      'documentos',
      'relatorios',
      'estatisticas'
    ],
    CoordenadorDisciplina: [
      'dashboard',
      'calendario_escolar',
      'alunos',
      'historico_escolar',
      'presencas',
      'horarios',
      'pautas',
      'boletins',
      'meu_perfil',
      'comunicacao',
      'relatorios',
      'estatisticas'
    ],
    Tesoureiro: [
      'dashboard',
      'calendario_escolar',
      'pagamentos',
      'relatorios_financeiros',
      'patrimonio',
      'meu_perfil',
      'comunicacao'
    ],
    Bibliotecario: [
      'dashboard',
      'calendario_escolar',
      'biblioteca',
      'horarios',
      'meu_perfil',
      'comunicacao'
    ],
    Estagiario: [
      'dashboard',
      'calendario_escolar',
      'horarios',
      'presencas',
      'meu_perfil',
      'comunicacao'
    ],
    TecnicoTI: [
      'dashboard',
      'calendario_escolar',
      'usuarios_perfis',
      'configuracoes',
      'auditoria_logs',
      'backup_restauro',
      'apoio_tecnico',
      'patrimonio',
      'meu_perfil',
      'comunicacao',
      'relatorios',
      'estatisticas'
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
    const escRestante = dbService.getEscolaAtiva();
    setEscola(escRestante);
    setAnosLectivos(dbService.getAnosLectivos(escRestante?.id));
    setAlunos(dbService.getAlunos());
    setTurmas(dbService.getTurmas());
    setDisciplinas(dbService.getDisciplinas());
    setFuncionarios(dbService.obterFuncionarios());
    setAtribuicoes(dbService.getAtribuicoes());
    setNotasConsolidadas(dbService.getNotasConsolidadas());
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
      f = dbService.criarOuAtualizarDiretorGeral(escolaId, {
        nomeCompleto: dados.nomeCompleto,
        numeroBI: dados.numeroBI,
        genero: dados.genero || 'M',
        email: dados.email,
        telefone: dados.telefone || '',
        password: dados.password,
        habilitacoes: dados.habilitacoes || ''
      });
    } else {
      f = {
        ...escolaIdOuDados,
        id: escolaIdOuDados.id || `dir-${Date.now()}`,
        role: 'DiretorGeral',
        cargo: 'Diretor Geral',
        password: dadosOuSenha || escolaIdOuDados.password || '',
        statusConta: 'Ativa',
        ativo: true
      } as Funcionario;
      dbService.salvarFuncionario(f);
    }
    setFuncionarios(dbService.obterFuncionarios());
    setEscolas(dbService.getEscolas());
    setEscola(dbService.getEscolaAtiva());
    setLogs(dbService.obterLogs());
    return f;
  };

  const handleRedefinirSenhaDiretor = (funcionarioId: string, novaSenha: string) => {
    dbService.redefinirSenhaFuncionario(funcionarioId, novaSenha);
    setFuncionarios(dbService.obterFuncionarios());
    setLogs(dbService.obterLogs());
  };

  // Handlers de Login / Logout
  const handleLogin = (user: Funcionario, escolaSelecionada: Escola, anoSelecionado: string) => {
    dbService.setCurrentUser(user);
    setAuthenticatedUser(user);
    dbService.setEscolaAtiva(escolaSelecionada.id);
    const anoFinal = anoSelecionado || escolaSelecionada.anoLectivoActivo || '';
    if (anoFinal && escolaSelecionada.id) {
      dbService.setAnoLectivoActivo(anoFinal, escolaSelecionada.id);
    }
    setEscola({ ...escolaSelecionada, anoLectivoActivo: anoFinal });
    setAnosLectivos(dbService.getAnosLectivos(escolaSelecionada.id));
    setTurmas(dbService.obterTurmas());
    setAlunos(dbService.obterAlunos());
    setAtribuicoes(dbService.obterAtribuicoes());
    setNotasConsolidadas(dbService.obterNotasConsolidadas());
    setIsAuthenticated(true);
    localStorage.setItem('sge_authenticated', 'true');
    setActiveTab('dashboard');
    setLogs(dbService.obterLogs());

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      firebaseSyncEngine.iniciarCicloInicialOnline().then(() => {
        recarregarDados();
      });
    }

    try {
      notificationService.inicializarBaselineRemoto(escolaSelecionada.id);
      const jaViuTour = localStorage.getItem(`sge_tour_completed_${user.id || user.role}`);
      if (jaViuTour !== 'true') {
        setTimeout(() => setShowTourModal(true), 600);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    notificationService.resetarBaseline();
    setModoApoioTecnico(null);
    dbService.setCurrentUser(null);
    setAuthenticatedUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('sge_authenticated');
      localStorage.removeItem('sge_active_tab');
      localStorage.removeItem('sge_apoio_escola_original_id');
    } catch {}
  };

  // Handler de Atualização de Perfil pelo próprio Usuário
  const handleSalvarPerfil = (perfilAtualizado: Funcionario) => {
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

  const handleLimparTodasDisciplinas = () => {
    dbService.limparTodasDisciplinas(escola?.id);
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
    notificationService.processarSolicitacaoNota(solicitacao, effectiveUser, false);
  };

  const handleSalvarFuncionario = (func: Funcionario) => {
    dbService.salvarFuncionario(func);
    setFuncionarios(dbService.obterFuncionarios());
    if (func.role === 'DiretorGeral' || (func.cargo || '').toLowerCase().includes('diretor')) {
      setEscolas(dbService.getEscolas());
      setEscola(dbService.getEscolaAtiva());
    }
    if (authenticatedUser && authenticatedUser.id === func.id) {
      setAuthenticatedUser(dbService.getCurrentUser());
    }
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
    notificationService.processarMensagem(msg, effectiveUser, false);
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
    if (jsonStr && jsonStr !== '__REFRESH_ONLY__') {
      dbService.restaurarBackupJSON(jsonStr);
    }
    setEscolas(dbService.getEscolas());
    const escRestaurada = dbService.obterEscola();
    setEscola(escRestaurada);
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
    setAnosLectivos(dbService.getAnosLectivos(escRestaurada?.id));
  };

  // Handlers de Apoio Técnico Emergencial (Admin Geral assumindo o papel de Diretor Geral)
  const handleIniciarApoioTecnico = (escolaId: string, solicitacaoId?: string) => {
    const listaEscolas = dbService.getEscolas();
    const esc = listaEscolas.find(e => e.id === escolaId) || escolas.find(e => e.id === escolaId);
    if (!esc) return;

    const escolaOriginalId = escola?.id && escola.id !== escolaId ? escola.id : undefined;
    try {
      if (escolaOriginalId) {
        localStorage.setItem('sge_apoio_escola_original_id', escolaOriginalId);
      } else {
        localStorage.removeItem('sge_apoio_escola_original_id');
      }
    } catch {}

    const solIdFinal = solicitacaoId || esc.sessaoApoioTecnicoAtiva?.solicitacaoId || '';
    dbService.iniciarSessaoApoioTecnico(escolaId, solIdFinal, currentUser);

    handleSelectEscola(escolaId);
    setModoApoioTecnico({
      escolaId,
      solicitacaoId: solIdFinal || undefined,
      escolaNome: esc.nomeOficial,
      escolaOriginalId
    });

    setActiveTab('dashboard');
  };

  const handleEncerrarModoApoio = (escolaIdOpcional?: string) => {
    const escolasBrutas = dbService.getEscolasBrutas();
    const idsParaEncerrar = new Set<string>();
    if (typeof escolaIdOpcional === 'string' && escolaIdOpcional.trim()) {
      idsParaEncerrar.add(escolaIdOpcional.trim());
    } else {
      if (modoApoioAtivo?.escolaId) idsParaEncerrar.add(modoApoioAtivo.escolaId);
      if (escola?.id) idsParaEncerrar.add(escola.id);
      escolasBrutas.forEach(e => {
        if (e.sessaoApoioTecnicoAtiva) idsParaEncerrar.add(e.id);
      });
    }

    idsParaEncerrar.forEach(id => {
      dbService.encerrarSessaoApoioTecnico(id, currentUser);
    });

    if (modoApoioAtivo?.solicitacaoId) {
      try {
        dbService.responderSolicitacaoApoioTecnico(
          modoApoioAtivo.solicitacaoId,
          'Concluido',
          currentUser.nomeCompleto,
          `Intervenção técnica ministerial concluída com sucesso às ${new Date().toLocaleTimeString('pt-AO')}.`
        );
      } catch {}
    }

    const originalEscolaId = modoApoioAtivo?.escolaOriginalId;
    setModoApoioTecnico(null);
    try {
      localStorage.removeItem('sge_apoio_escola_original_id');
    } catch {}

    const escolasFrescas = dbService.getEscolas();
    if (originalEscolaId && !idsParaEncerrar.has(originalEscolaId)) {
      const escOrig = escolasFrescas.find(e => e.id === originalEscolaId);
      if (escOrig) {
        dbService.setEscolaAtiva(originalEscolaId);
      }
    }

    setEscolas(dbService.getEscolas());
    setEscola(dbService.getEscolaAtiva());
    setFuncionarios(dbService.obterFuncionarios());
    setSolicitacoes(dbService.obterSolicitacoes());
    setLogs(dbService.obterLogs());
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

  const temSessaoApoioAdminGeral = Boolean(modoApoioAtivo);
  const poderesDelegados = dbService.verificarPoderesDelegados(currentUser.id, escola.id);
  const temDelegacaoMatriculas = poderesDelegados.podeMatricular;
  const temDelegacaoCobranca = poderesDelegados.podeCobrarEmolumentos || (poderesDelegados as any).podeCobrar || dbService.getDelegacoesCobranca(escola.id).some(d => d.funcionarioId === currentUser.id && d.ativo);

  const isAbaPermitida = 
    Boolean(modoApoioAtivo)
      ? true // No modo de apoio técnico o Administrador Geral possui acesso irrestrito a todos os menus do Diretor Geral da escola
      : (currentUser.role === 'AdminGeral' && activeTab === 'comissao_juri'
        ? false // Administrador geral não precisa ver comissões de júri
        : (temSessaoApoioAdminGeral // Admin Geral em apoio técnico tem acesso aos outros módulos
          || (activeTab === 'pagamentos' && temDelegacaoCobranca) // Acesso por delegação financeira do Diretor
          || (activeTab === 'alunos' && temDelegacaoMatriculas) // Acesso por delegação de matrículas do Diretor
          || (activeTab === 'comissao_juri' && isMembroJuriAtivo)
          || (activeTab === 'relatorios' || activeTab === 'estatisticas') // Acesso oficial sem restrições para Direção, Professores, Coordenadores e Secretaria
          || allowedTabsPorRole[effectiveUser.role]?.includes(activeTab)));

  // Isolamento Rigoroso de Dados por Escola e Ano Letivo Ativo
  const escolaIdAtiva = escola?.id || '';
  const isGlobalNetworkScope = escolaIdAtiva === 'todas';
  const anoActivo = escola.anoLectivoActivo || '';

  // 1. Alunos estritamente da escola atual
  const alunosDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return alunos;
    return alunos.filter(a => a.escolaId === escolaIdAtiva);
  }, [alunos, escolaIdAtiva, isGlobalNetworkScope]);

  // 1.1 Alunos confirmados/matriculados no ano letivo ativo
  const alunosDoAnoActivo = useMemo(() => {
    if (!anoActivo) {
      return alunosDaEscola.filter(a => !(a.anoLectivo || a.anoMatricula));
    }
    return alunosDaEscola.filter(a => {
      const ano = a.anoLectivo || a.anoMatricula;
      return !ano || ano === anoActivo;
    });
  }, [alunosDaEscola, anoActivo]);

  // 2. Turmas estritamente da escola atual
  const turmasDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return turmas;
    return turmas.filter(t => t.escolaId === escolaIdAtiva);
  }, [turmas, escolaIdAtiva, isGlobalNetworkScope]);

  // 2.1 Turmas do ano letivo ativo (estritamente isoladas pelo ano lectivo ativo)
  const turmasDoAnoActivo = useMemo(() => {
    if (!anoActivo) return [];
    return turmasDaEscola.filter(t => t.anoLectivo === anoActivo);
  }, [turmasDaEscola, anoActivo]);

  // 3. Atribuições docentes estritamente da escola atual
  const atribuicoesDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return atribuicoes;
    return atribuicoes.filter(at => at.escolaId === escolaIdAtiva);
  }, [atribuicoes, escolaIdAtiva, isGlobalNetworkScope]);

  // 3.1 Atribuições docentes do ano letivo ativo (estritamente isoladas pelo ano lectivo ativo)
  const atribuicoesDoAnoActivo = useMemo(() => {
    if (!anoActivo) return [];
    return atribuicoesDaEscola.filter(at => at.anoLectivo === anoActivo);
  }, [atribuicoesDaEscola, anoActivo]);

  // 4. Disciplinas estritamente da escola atual
  const disciplinasDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return disciplinas;
    return disciplinas.filter(d => d.escolaId === escolaIdAtiva);
  }, [disciplinas, escolaIdAtiva, isGlobalNetworkScope]);

  // 5. Funcionários estritamente da escola atual (excluindo AdminGeral)
  const funcionariosDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return funcionarios.filter(f => f.role !== 'AdminGeral');
    return funcionarios.filter(f => f.escolaId === escolaIdAtiva && f.role !== 'AdminGeral');
  }, [funcionarios, escolaIdAtiva, isGlobalNetworkScope]);

  // 6. Avaliações, Júris, Mensagens, Biblioteca, Assiduidade e Solicitações estritamente da escola atual
  const avaliacoesDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return avaliacoes;
    return avaliacoes.filter(av => av.escolaId === escolaIdAtiva);
  }, [avaliacoes, escolaIdAtiva, isGlobalNetworkScope]);

  const jurisDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return juris;
    return juris.filter(j => j.escolaId === escolaIdAtiva);
  }, [juris, escolaIdAtiva, isGlobalNetworkScope]);

  const mensagensDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return mensagens;
    return mensagens.filter(m => m.escolaId === escolaIdAtiva);
  }, [mensagens, escolaIdAtiva, isGlobalNetworkScope]);

  const livrosDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return livros;
    return livros.filter(l => l.escolaId === escolaIdAtiva);
  }, [livros, escolaIdAtiva, isGlobalNetworkScope]);

  const assiduidadeDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return assiduidade;
    const funcsIds = new Set(funcionariosDaEscola.map(f => f.id));
    return assiduidade.filter(a => a.escolaId === escolaIdAtiva || funcsIds.has(a.funcionarioId));
  }, [assiduidade, escolaIdAtiva, isGlobalNetworkScope, funcionariosDaEscola]);

  const solicitacoesDaEscola = useMemo(() => {
    if (!escolaIdAtiva) return [];
    if (isGlobalNetworkScope) return solicitacoes;
    return solicitacoes.filter(s => s.escolaId === escolaIdAtiva);
  }, [solicitacoes, escolaIdAtiva, isGlobalNetworkScope]);

  // 7. Notas consolidadas do ano letivo ativo e escola atual
  const notasConsolidadasDoAnoActivo = useMemo(() => {
    if (!escolaIdAtiva || !anoActivo) return [];
    const alunosIdsMap = new Set(alunosDaEscola.map(a => a.id));
    const turmasIdsMap = new Set(turmasDaEscola.map(t => t.id));
    return notasConsolidadas.filter(n => {
      const escOk = isGlobalNetworkScope || n.escolaId === escolaIdAtiva || alunosIdsMap.has(n.alunoId) || turmasIdsMap.has(n.turmaId);
      const anoOk = !n.anoLectivo || n.anoLectivo === anoActivo;
      return escOk && anoOk;
    });
  }, [notasConsolidadas, escolaIdAtiva, isGlobalNetworkScope, anoActivo, alunosDaEscola, turmasDaEscola]);

  // Ecrã de Verificação Soberana Inicial contra o Firebase (Apenas se utilizador NÃO estiver autenticado)
  if (verificandoAdminOnline && !isAuthenticated) {
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

  // 1. Verificação Primária: SÓ exibe a página de configuração inicial se verificado ONLINE
  // que NÃO existe conta de Administrador Geral (e se a internet NÃO estiver lenta nem offline).
  if (mostrarSetupInicial && !isAuthenticated) {
    return (
      <>
        <SyncProgressBarAndNotification onSyncComplete={recarregarDados} />
        <SystemInitialSetupView
          onSetupConcluido={(novoAdmin) => {
            setMostrarSetupInicial(false);
            setTemAdminGeral(true);
            setAuthenticatedUser(novoAdmin);
            setIsAuthenticated(true);
            localStorage.setItem('sge_authenticated', 'true');
            setFuncionarios(dbService.obterFuncionarios());
            setEscolas(dbService.getEscolas());
            setEscola(dbService.getEscolaAtiva());
            setActiveTab('dashboard');
            if (typeof navigator !== 'undefined' && navigator.onLine) {
              firebaseSyncEngine.iniciarCicloInicialOnline().then(() => {
                recarregarDados();
              });
            }
          }}
        />
      </>
    );
  }

  // Ecrã Oficial de Autenticação se não houver sessão ativa (virgem e sem secção de configuração do administrador)
  if (!isAuthenticated) {
    return (
      <>
        <SyncProgressBarAndNotification onSyncComplete={recarregarDados} />
        <LoginView
          escolas={escolas}
          selectedEscola={escola}
          onSelectEscola={handleSelectEscola}
          anosLectivos={anosLectivos}
          selectedAno={escola.anoLectivoActivo || ''}
          onSelectAno={handleSelectAnoLectivo}
          funcionarios={funcionarios}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Barra de Progresso e Notificação de Sincronização em Tempo Real com o Firebase */}
      <SyncProgressBarAndNotification onSyncComplete={recarregarDados} />

      {/* Notificação Flutuante de Instalação PWA */}
      <PWAInstallNotification />

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
        onNavigateToTab={(tab, subTab) => {
          setActiveTab(tab as NavTab);
          if (subTab === 'solicitacoes') {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('sge_open_evaluation_subtab', { detail: 'solicitacoes' }));
            }, 80);
          } else if (tab === 'biblioteca' || subTab === 'biblioteca') {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('sge_open_comm_subtab', { detail: 'biblioteca' }));
            }, 80);
          }
        }}
        onLogout={handleLogout}
        onOpenSecurityEngine={effectiveUser.role === 'AdminGeral' ? () => setShowSecurityModal(true) : undefined}
        onOpenTour={() => setShowTourModal(true)}
      />

      {/* Alerta de Regras do Firestore (quando o projeto externo sge4-8b772 tem regras travadas) */}
      {firebasePermissaoNegada && !dispensarAvisoRegras && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white px-4 py-3 shadow-md z-30 no-print border-b border-amber-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0 mt-0.5">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white text-sm">
                  Firebase Firestore (sge4-8b772): Regras de Acesso Requerem Publicação na Consola
                </p>
                <p className="text-amber-100 mt-0.5 leading-relaxed">
                  Para que os dados sejam gravados na nuvem do seu projeto Firebase, aceda a{' '}
                  <span className="font-mono bg-black/20 px-1 py-0.5 rounded text-white">Firebase Console &gt; Firestore Database &gt; Regras (Rules)</span>{' '}
                  e publique a regra de escrita: <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-white font-bold">allow read, write: if true;</code>. 
                  Enquanto isso, todas as contas e alterações estão totalmente salvas e protegidas no motor offline do seu dispositivo.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDispensarAvisoRegras(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition-all shrink-0 self-end md:self-auto cursor-pointer"
            >
              Compreendi / Dispensar
            </button>
          </div>
        </div>
      )}

      {/* Banner de Sessão de Apoio Técnico Ativa (Admin Geral no papel de Diretor Geral da Escola) */}
      {modoApoioAtivo && (
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
                Instituição: <strong>{modoApoioAtivo.escolaNome || escola.nomeOficial}</strong> · Menus pedagógicos, turmas, pautas e configurações desbloqueados.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleEncerrarModoApoio(modoApoioAtivo.escolaId)}
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
          onOpenTour={() => setShowTourModal(true)}
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
                  currentUser={effectiveUser}
                  alunos={alunosDoAnoActivo}
                  funcionarios={funcionariosDaEscola}
                  turmas={turmasDoAnoActivo}
                  notasConsolidadas={notasConsolidadasDoAnoActivo}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenSecurityModal={effectiveUser.role === 'AdminGeral' ? () => setShowSecurityModal(true) : undefined}
                  onOpenTour={() => setShowTourModal(true)}
                />
              )}

              {/* 2. ACADÊMICO (Ano Letivo, Classes, Cursos, Disciplinas, Turmas, Turnos) */}
              {(activeTab === 'ano_lectivo' || activeTab === 'classes' || activeTab === 'cursos' || activeTab === 'disciplinas' || activeTab === 'turmas' || activeTab === 'turnos' || activeTab === 'academico') && (
                <AcademicManagementView
                  escola={escola}
                  turmas={turmasDaEscola}
                  disciplinas={disciplinasDaEscola}
                  atribuicoes={atribuicoesDaEscola}
                  funcionarios={funcionariosDaEscola}
                  juris={jurisDaEscola}
                  onSalvarEscola={handleSalvarEscola}
                  onSalvarTurma={handleSalvarTurma}
                  onEliminarTurma={handleEliminarTurma}
                  onSalvarDisciplina={handleSalvarDisciplina}
                  onEliminarDisciplina={handleEliminarDisciplina}
                  onLimparDisciplinas={handleLimparTodasDisciplinas}
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
                  currentUser={effectiveUser}
                />
              )}

              {/* GESTÃO DE HORÁRIOS ESCOLARES SEM CONFLITO & NOTIFICAÇÕES A PROFESSORES */}
              {activeTab === 'horarios' && (
                <ScheduleTimetableView
                  escola={escola}
                  currentUser={effectiveUser}
                  turmas={turmasDoAnoActivo}
                  disciplinas={disciplinasDaEscola}
                  funcionarios={funcionariosDaEscola}
                />
              )}

              {/* FICHAS DE PRESENÇAS DOS ALUNOS E PROFESSORES (MANUAL & QR + IMPRESSÃO OFICIAL) */}
              {activeTab === 'presencas' && (
                <StudentAttendanceReportView
                  escola={escola}
                  currentUser={effectiveUser}
                  turmas={turmasDoAnoActivo}
                  alunos={alunosDoAnoActivo}
                  disciplinas={disciplinasDaEscola}
                  funcionarios={funcionariosDaEscola}
                  atribuicoes={atribuicoesDoAnoActivo}
                  assiduidadeFuncionarios={assiduidadeDaEscola}
                  onSalvarRegistoAssiduidade={handleSalvarRegistoAssiduidade}
                  onAtualizarAssiduidade={() => setAssiduidade(dbService.obterAssiduidade())}
                />
              )}

              {/* PASSES ESCOLARES (8 POR FOLHA A4 & CONFIGURADOR DE ELEMENTOS/CORES) */}
              {activeTab === 'passes_escolares' && (
                <StudentPassesView
                  escola={escola}
                  alunos={alunosDoAnoActivo}
                  turmas={turmasDoAnoActivo}
                  currentUser={effectiveUser}
                  onSalvarEscola={handleSalvarEscola}
                />
              )}

              {/* 3. GESTÃO: Alunos & Histórico Escolar */}
              {(activeTab === 'alunos' || activeTab === 'estudantes' || activeTab === 'historico_escolar') && (
                <StudentsView
                  escola={escola}
                  currentUser={effectiveUser}
                  atribuicoes={atribuicoesDoAnoActivo}
                  alunos={alunosDaEscola}
                  turmas={turmasDaEscola}
                  initialSubTab={activeTab === 'historico_escolar' ? 'historico' : undefined}
                  onSalvarAluno={handleSalvarAluno}
                  onExcluirAluno={handleExcluirAluno}
                />
              )}

              {/* 3. GESTÃO: Professores, RH */}
              {(activeTab === 'professores' || activeTab === 'rh') && (
                <HumanResourcesView
                  escola={escola}
                  currentUser={effectiveUser}
                  funcionarios={funcionariosDaEscola}
                  assiduidade={assiduidadeDaEscola}
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
                  currentUser={effectiveUser}
                  funcionarios={funcionariosDaEscola}
                  turmas={turmasDoAnoActivo}
                  alunos={alunosDoAnoActivo}
                  onSalvarEscola={handleSalvarEscola}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {/* 3. GESTÃO: Coordenação (MAC / Avaliações) */}
              {(activeTab === 'coordenacao' || activeTab === 'avaliacoes') && (
                <EvaluationMacView
                  escola={escola}
                  currentUser={effectiveUser}
                  turmas={turmasDoAnoActivo}
                  atribuicoes={atribuicoesDoAnoActivo}
                  disciplinas={disciplinasDaEscola}
                  alunos={alunosDoAnoActivo}
                  tiposAvaliacao={tiposAvaliacao}
                  regrasMAC={regrasMAC}
                  avaliacoes={avaliacoesDaEscola}
                  notas={notas}
                  notasConsolidadas={notasConsolidadasDoAnoActivo}
                  solicitacoes={solicitacoesDaEscola}
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
                  currentUser={effectiveUser}
                  comissoes={jurisDaEscola}
                  turmas={turmasDoAnoActivo}
                  disciplinas={disciplinasDaEscola}
                  alunos={alunosDoAnoActivo}
                  notasConsolidadas={notasConsolidadasDoAnoActivo}
                  atribuicoes={atribuicoesDoAnoActivo}
                  funcionarios={funcionariosDaEscola}
                  onSalvarComissao={handleSalvarJuri}
                  onEliminarComissao={handleEliminarJuri}
                  onVoltarParaPainel={() => setActiveTab('dashboard')}
                />
              )}

              {/* 4. DOCUMENTOS: Declarações, Certificados, Pautas, Boletins, Termos de Exame */}
              {(activeTab === 'declaracoes' || activeTab === 'certificados' || activeTab === 'pautas' || activeTab === 'boletins' || activeTab === 'termos_exame' || activeTab === 'documentos') && (
                <PrintingDocumentsView
                  escola={escola}
                  currentUser={effectiveUser}
                  atribuicoes={atribuicoesDoAnoActivo}
                  alunos={alunosDaEscola}
                  turmas={turmasDaEscola}
                  disciplinas={disciplinasDaEscola}
                  notasConsolidadas={notasConsolidadasDoAnoActivo}
                  initialDocType={
                    activeTab === 'pautas' ? 'pautas' :
                    activeTab === 'certificados' ? 'certificado_ciclo' :
                    activeTab === 'declaracoes' ? 'declaracao_notas' :
                    activeTab === 'boletins' ? 'boletim_oficial' :
                    activeTab === 'termos_exame' ? 'termos_exame' : undefined
                  }
                />
              )}

              {/* 4.1 RELATÓRIOS OFICIAIS & BALANÇOS MED */}
              {activeTab === 'relatorios' && (
                <ReportsView
                  escola={escola}
                  escolas={escolas}
                  currentUser={effectiveUser}
                  turmas={effectiveUser.role === 'AdminGeral' ? turmas : turmasDaEscola}
                  alunos={effectiveUser.role === 'AdminGeral' ? alunos : alunosDaEscola}
                  disciplinas={effectiveUser.role === 'AdminGeral' ? disciplinas : disciplinasDaEscola}
                  notasConsolidadas={effectiveUser.role === 'AdminGeral' ? notasConsolidadas : notasConsolidadasDoAnoActivo}
                  funcionarios={effectiveUser.role === 'AdminGeral' ? funcionarios.filter(f => f.role !== 'AdminGeral') : funcionariosDaEscola}
                  atribuicoes={effectiveUser.role === 'AdminGeral' ? atribuicoes : atribuicoesDoAnoActivo}
                  onMudarEscola={(escId) => handleSelectEscola(escId)}
                />
              )}

              {/* 4.2 ESTATÍSTICAS & ANALYTICS */}
              {activeTab === 'estatisticas' && (
                <StatisticsView
                  escola={escola}
                  escolas={escolas}
                  currentUser={effectiveUser}
                  turmas={effectiveUser.role === 'AdminGeral' ? turmas : turmasDaEscola}
                  alunos={effectiveUser.role === 'AdminGeral' ? alunos : alunosDaEscola}
                  disciplinas={effectiveUser.role === 'AdminGeral' ? disciplinas : disciplinasDaEscola}
                  notasConsolidadas={effectiveUser.role === 'AdminGeral' ? notasConsolidadas : notasConsolidadasDoAnoActivo}
                  funcionarios={effectiveUser.role === 'AdminGeral' ? funcionarios.filter(f => f.role !== 'AdminGeral') : funcionariosDaEscola}
                  atribuicoes={effectiveUser.role === 'AdminGeral' ? atribuicoes : atribuicoesDoAnoActivo}
                  onMudarEscola={(escId) => handleSelectEscola(escId)}
                />
              )}

              {/* 5. FINANCEIRO: Pagamentos e Relatórios Financeiros */}
              {(activeTab === 'pagamentos' || activeTab === 'relatorios_financeiros' || activeTab === 'financeiro') && (
                <AdministrativeFinanceView
                  escola={escola}
                  currentUser={effectiveUser}
                  alunos={alunosDaEscola}
                  turmas={turmasDaEscola}
                  onSalvarAluno={handleSalvarAluno}
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
                  funcionarios={funcionariosDaEscola}
                  alunos={alunosDaEscola}
                  turmas={turmasDaEscola}
                  mensagens={mensagensDaEscola}
                  livros={livrosDaEscola}
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
                  alunos={effectiveUser.role === 'AdminGeral' ? alunos : alunosDaEscola}
                  funcionarios={effectiveUser.role === 'AdminGeral' ? funcionarios : funcionariosDaEscola}
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
                    handleIniciarApoioTecnico(escId);
                  }}
                  onSelecionarEscolaParaApoio={(escId: string) => {
                    handleIniciarApoioTecnico(escId);
                  }}
                  onIniciarApoioTecnico={handleIniciarApoioTecnico}
                  onEncerrarApoioTecnico={(escId?: string) => {
                    handleEncerrarModoApoio(escId);
                  }}
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
                  onSelecionarEscolaParaInspecao={(escId: string) => {
                    handleIniciarApoioTecnico(escId);
                  }}
                  onEncerrarApoioEscola={(escId: string) => {
                    handleEncerrarModoApoio(escId);
                    setActiveTab('admin_escolas');
                  }}
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
      {showSetupModal && (
        <InitialSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onSaveSetup={handleSaveSetup}
          escolasExistentes={escolas}
        />
      )}

      {/* Motor de Segurança & Criptografia AES-256 em Tempo Real (Exclusivo Admin Geral) */}
      {currentUser.role === 'AdminGeral' && showSecurityModal && (
        <RealtimeSecurityModal
          isOpen={showSecurityModal}
          onClose={() => setShowSecurityModal(false)}
          onAbrirSetupInicial={() => setTemAdminGeral(false)}
          currentUserRole={currentUser.role}
        />
      )}

      {/* Tour Guiado Oficial da Dashboard e Plataforma */}
      {showTourModal && (
        <GuidedTourModal
          isOpen={showTourModal}
          onClose={() => setShowTourModal(false)}
          currentUser={effectiveUser}
          escola={escola}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setShowTourModal(false);
          }}
        />
      )}
    </div>
  );
}
