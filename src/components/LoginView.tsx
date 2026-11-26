import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Search, 
  HelpCircle, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  X,
  Phone,
  Building2,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';
import { Escola, Funcionario, Aluno } from '../types';
import { dbService } from '../services/storage';
import { cryptoService } from '../services/cryptoService';
import { securityEngine } from '../services/securityEngine';
import { firebaseSyncEngine } from '../services/firebaseSyncEngine';
import { InsigniaAngola } from '../constants/insignia';
import { sanitizeSearchInput, safeSearchMatch } from '../utils/securitySanitizer';
import { Footer } from './Footer';
import { ConfiguracaoSistema } from '../types';
import { antiSpamService } from '../services/antiSpamService';
import { openLegalPolicyModal } from '../services/legalPoliciesService';
import { useTheme } from '../services/themeService';

const ParentStudentReportView = React.lazy(() =>
  import('./ParentStudentReportView').then((m) => ({ default: m.ParentStudentReportView }))
);

interface LoginViewProps {
  escolas: Escola[];
  selectedEscola: Escola;
  onSelectEscola: (escolaId: string) => void;
  anosLectivos: string[];
  selectedAno: string;
  onSelectAno: (ano: string) => void;
  funcionarios: Funcionario[];
  onLogin: (user: Funcionario, escola: Escola, anoLectivo: string) => void;
  onOpenSetupModal?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  escolas,
  selectedEscola,
  onSelectEscola,
  anosLectivos,
  selectedAno,
  onSelectAno,
  funcionarios,
  onLogin
}) => {
  const [configSistema, setConfigSistema] = useState<ConfiguracaoSistema>(() => dbService.getConfiguracaoSistema());
  const [redeOnline, setRedeOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const { isDark, toggleDarkMode } = useTheme();

  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sincronização inicial de parâmetros e insígnia oficial
  React.useEffect(() => {
    let ativo = true;
    firebaseSyncEngine.buscarConfiguracaoSistema().then((cfg) => {
      if (ativo && cfg) {
        setConfigSistema(cfg);
      }
    });

    const handleRemoteCfg = () => {
      if (ativo) {
        setConfigSistema(dbService.getConfiguracaoSistema());
      }
    };
    const handleOnline = () => setRedeOnline(true);
    const handleOffline = () => setRedeOnline(false);
    window.addEventListener('sge_dados_atualizados_remoto', handleRemoteCfg);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      ativo = false;
      window.removeEventListener('sge_dados_atualizados_remoto', handleRemoteCfg);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Modal Esqueci a Senha
  const [showEsqueciSenha, setShowEsqueciSenha] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [msgRecuperacao, setMsgRecuperacao] = useState<string | null>(null);

  // Modal Consultar Educando (Portal dos Encarregados)
  const [showConsultarModal, setShowConsultarModal] = useState(false);
  const [termoConsulta, setTermoConsulta] = useState('');
  const [alunoConsultado, setAlunoConsultado] = useState<Aluno | null>(null);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);

  // Proteção Anti-Spam (Honeypot + Tempo Mínimo + Desafio Humano se necessário)
  const [hpTrap, setHpTrap] = useState('');
  const [formAbertoEm] = useState<number>(() => Date.now());
  const [desafioHumano, setDesafioHumano] = useState<{ pergunta: string; respostaEsperada: number } | null>(null);
  const [respostaDesafio, setRespostaDesafio] = useState('');

  const handleSubmeterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin(null);

    if (desafioHumano) {
      if (Number(respostaDesafio.trim()) !== desafioHumano.respostaEsperada) {
        setErroLogin('Verificação anti-spam incorreta. Por favor resolva a soma corretamente.');
        return;
      }
      setDesafioHumano(null);
      setRespostaDesafio('');
    }

    const antiSpamRes = antiSpamService.validarSubmissao({
      acao: 'login',
      honeypotValor: hpTrap,
      formularioAbertoEmMs: formAbertoEm,
      conteudoPrincipal: identificador,
      identificadorAutor: (identificador || 'anon').trim().toLowerCase()
    });
    if (!antiSpamRes.permitido) {
      if (antiSpamRes.exigirDesafio) {
        setDesafioHumano(antiSpamService.gerarDesafioHumano());
        setRespostaDesafio('');
      }
      setErroLogin(antiSpamRes.motivo || 'Submissão bloqueada pela proteção anti-spam.');
      return;
    }

    // 1. Blindagem Anti-DDoS e Anti-Derrubação: Taxa máxima de 20 logins por minuto
    const statusRateLimit = dbService.verificarRateLimitGlobalLogin();
    if (statusRateLimit.bloqueado) {
      setErroLogin(statusRateLimit.mensagem || `ALERTA DE SEGURANÇA: Limite de taxa de logins atingido para proteger o sistema. Aguarde ${statusRateLimit.segundosRestantes}s.`);
      return;
    }

    // 2. Sanitização estrita contra injeção e buffer bombs nas caixas de credenciais
    const idLimpo = sanitizeSearchInput(identificador, 120).toLowerCase();
    if (!idLimpo || idLimpo.length < 3) {
      setErroLogin('Por favor introduza um identificador válido (Email institucional, BI ou Nome de utilizador).');
      return;
    }

    // 3. Verificação de Imunidade Soberana: O perfil do Administrador Geral NÃO PODE ser bloqueado
    const ehAdminGeral = securityEngine.isIdentificadorAdminGeral(idLimpo);

    // 4. Verificar bloqueio prévio de segurança por tentativas erradas nesta conta (exceto Admin Geral)
    if (!ehAdminGeral) {
      const statusBloqueio = dbService.verificarBloqueioLogin(idLimpo);
      if (statusBloqueio.bloqueado) {
        const mins = Math.ceil((statusBloqueio.segundosRestantes || 60) / 60);
        setErroLogin(`ALERTA DE SEGURANÇA: Acesso temporariamente bloqueado após 3 tentativas com credenciais erradas. Por favor, aguarde ${mins} minuto(s) ou solicite desbloqueio junto da DTI.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      // 5. Busca Real do Perfil: Busca no Firebase (Online) e no Dispositivo (Offline)
      let utilizadorEncontrado: Funcionario | null = null;
      try {
        utilizadorEncontrado = await firebaseSyncEngine.buscarPerfilUsuario(idLimpo);
      } catch (err) {
        console.warn('[Login] Falha ao consultar Firebase, buscando no dispositivo:', err);
      }

      // Se não encontrou no Firebase ou offline, verificar na lista carregada em memória/dispositivo com correspondência estrita
      if (!utilizadorEncontrado) {
        const funcsFrescos = dbService.getFuncionarios();
        const idSemEspaco = idLimpo.replace(/\s+/g, '');
        utilizadorEncontrado = funcsFrescos.find(f => {
          const fEmail = (f.email || '').trim().toLowerCase();
          const fBi = (f.numeroBI || '').toLowerCase().replace(/\s+/g, '');
          const fNome = (f.nomeCompleto || '').trim().toLowerCase();
          const fId = (f.id || '').trim().toLowerCase();
          return fEmail === idLimpo ||
                 fBi === idSemEspaco ||
                 fNome === idLimpo ||
                 fId === idLimpo;
        }) || null;
      }

      // Se ainda não encontrado e o utilizador digitou explicitamente o utilizador admin mestre
      if (!utilizadorEncontrado && (idLimpo === 'admin' || idLimpo === 'admin.geral' || idLimpo === 'admingeral' || idLimpo === 'superadmin')) {
        const funcsTodos = dbService.getFuncionarios();
        utilizadorEncontrado = funcsTodos.find(f => f.role === 'AdminGeral' && f.ativo) || null;
      }

      const ehRealmenteAdminGeral = (utilizadorEncontrado?.role === 'AdminGeral') || (idLimpo === 'admin' || idLimpo === 'admingeral' || idLimpo === 'superadmin');

      if (!utilizadorEncontrado) {
        const tentativa = dbService.registarTentativaLogin(identificador, false);
        setIsLoading(false);
        if (ehRealmenteAdminGeral) {
          setErroLogin(`Perfil de Administrador Geral não encontrado. Por favor, verifique se o cadastro foi concluído.`);
        } else if (tentativa.bloqueado) {
          setErroLogin('ALERTA DE SEGURANÇA: 3 tentativas inválidas consecutivas. Acesso bloqueado por 15 minutos e alerta ministerial emitido.');
        } else {
          setErroLogin(`Utilizador "${identificador}" não encontrado. Verifique o Email, BI ou Nome introduzido.`);
        }
        return;
      }

      // Validar senha (com verificação direta, checksum SHA-256 e decifragem AES-256)
      let senhaValida = utilizadorEncontrado.password || '';
      let bateuSenha = false;

      // 1. Comparação direta com texto plano
      if (senhaValida && senha.trim() === senhaValida.trim()) {
        bateuSenha = true;
      }

      // 2. Se a senha gravada estiver encriptada em AES-256
      if (!bateuSenha && senhaValida && cryptoService.isEncriptado(senhaValida)) {
        // A. Verificar pelo SHA-256 checksum embutido na serialização
        const partes = senhaValida.split(':');
        const checksum = partes[partes.length - 1];
        if (checksum && checksum.length === 64) {
          try {
            const inputSha = await cryptoService.calcularSHA256(senha.trim());
            if (inputSha.toLowerCase() === checksum.toLowerCase()) {
              bateuSenha = true;
            }
          } catch (shaErr) {
            console.warn('[Login] Falha ao verificar checksum SHA-256:', shaErr);
          }
        }

        // B. Se o checksum não bateu, tentar decifragem direta
        if (!bateuSenha) {
          try {
            const decifrada = await cryptoService.decriptarTexto(senhaValida);
            if (decifrada && decifrada.trim() === senha.trim()) {
              bateuSenha = true;
            }
          } catch (e) {
            console.warn('[Login] Falha ao decifrar senha AES-256:', e);
          }
        }
      }

      if (!bateuSenha) {
        const tentativa = dbService.registarTentativaLogin(identificador, false);
        setIsLoading(false);
        if (ehRealmenteAdminGeral) {
          setErroLogin(`Palavra-passe incorreta para o Administrador Geral. Verifique a palavra-passe definida durante a configuração do sistema.`);
        } else if (tentativa.bloqueado) {
          setErroLogin('ALERTA DE SEGURANÇA: 3 tentativas com palavra-passe errada excedidas! Acesso temporariamente bloqueado.');
        } else {
          setErroLogin(`Palavra-passe incorreta. Tentativa falhada ${tentativa.tentativas} de 3 antes do bloqueio de segurança.`);
        }
        return;
      }

      if (!ehRealmenteAdminGeral && (utilizadorEncontrado.statusConta === 'Suspensa' || utilizadorEncontrado.ativo === false)) {
        setIsLoading(false);
        setErroLogin(`A conta de ${utilizadorEncontrado.nomeCompleto} encontra-se suspensa.`);
        return;
      }

      // Sucesso no login - resetar contador de falhas e atualizar utilizador no dispositivo
      dbService.registarTentativaLogin(identificador, true);
      firebaseSyncEngine.atualizarUsuarioNoDispositivo(utilizadorEncontrado);

      let escolaParaLogin = selectedEscola;
      if (utilizadorEncontrado.escolaId && utilizadorEncontrado.role !== 'AdminGeral') {
        const escolaDoUsuario = escolas.find(e => e.id === utilizadorEncontrado.escolaId);
        if (escolaDoUsuario) {
          escolaParaLogin = escolaDoUsuario;
        }
      }
      if (!escolaParaLogin) {
        escolaParaLogin = escolas[0] || dbService.getEscolaAtiva();
      }
      setIsLoading(false);
      onLogin(utilizadorEncontrado, escolaParaLogin, selectedAno || escolaParaLogin.anoLectivoActivo || '');
    } catch (err: any) {
      console.error('[Login] Erro ao autenticar:', err);
      setIsLoading(false);
      setErroLogin('Ocorreu uma falha no processamento de login. Tente novamente.');
    }
  };

  // Pesquisa de Aluno para o Encarregado
  const handlePesquisarEducando = (e: React.FormEvent) => {
    e.preventDefault();
    setErroConsulta(null);
    setAlunoConsultado(null);

    const antiSpamConsulta = antiSpamService.validarSubmissao({
      acao: 'consulta_encarregado',
      honeypotValor: hpTrap,
      conteudoPrincipal: termoConsulta,
      identificadorAutor: 'portal_encarregado'
    });
    if (!antiSpamConsulta.permitido) {
      setErroConsulta(antiSpamConsulta.motivo || 'Limite de consultas atingido. Aguarde um momento.');
      return;
    }

    const termo = sanitizeSearchInput(termoConsulta, 60).toLowerCase();
    if (!termo) {
      setErroConsulta('Introduza o Código de Matrícula ou Número do BI do educando.');
      return;
    }

    const alunosDisponiveis = dbService.getAlunos();
    const aluno = alunosDisponiveis.find(a => 
      safeSearchMatch(a.codigoMatricula, termo) ||
      safeSearchMatch(a.numeroBI, termo) ||
      safeSearchMatch(a.numeroDocumento, termo) ||
      safeSearchMatch(a.nomeCompleto, termo)
    );

    if (aluno) {
      setAlunoConsultado(aluno);
    } else {
      setErroConsulta('Nenhum educando encontrado com os dados informados. Verifique o código de matrícula no cartão de estudante ou recibo de pagamento.');
    }
  };

  const handleEntrarComoEncarregado = (aluno: Aluno) => {
    const encarregadoUser: Funcionario = {
      id: `enc-${aluno.id}`,
      escolaId: aluno.escolaId || selectedEscola.id,
      nomeCompleto: aluno.nomeEncarregado || `Encarregado de ${aluno.nomeCompleto}`,
      numeroBI: '000000000LA000',
      telefone: aluno.telefoneEncarregado || '+244 923 000 000',
      email: 'encarregado@portal.ao',
      cargo: 'Encarregado de Educação',
      role: 'Encarregado',
      genero: 'M',
      habilitacoes: 'Ensino Médio',
      fotoUrl: aluno.fotoUrl || '',
      ehProfessor: false,
      ehAdministrativoQueLeciona: false,
      dataAdmissao: new Date().toISOString().split('T')[0],
      ativo: true
    };

    const escolaDoAluno = escolas.find(e => e.id === aluno.escolaId) || selectedEscola;
    onLogin(encarregadoUser, escolaDoAluno, selectedAno);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative">
      {/* Luz ambiente suave */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Botão flutuante discreto de Tema (Claro / Escuro) no Login */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold shadow-sm backdrop-blur-xs transition-colors cursor-pointer"
          title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-sky-300" />}
          <span className="hidden sm:inline">{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
        </button>
      </div>

      {/* Cabeçalho Oficial Heráldico Centralizado */}
      <header className="pt-8 sm:pt-12 pb-4 text-center z-10 px-4">
        <div className="flex flex-col items-center justify-center space-y-2.5">
          {/* Insígnia da República de Angola - Logótipo Oficial do Sistema */}
          <div className="flex justify-center mb-1">
            <InsigniaAngola 
              size={82} 
              customUrl={configSistema.insigniaNacionalUrl} 
              className="drop-shadow-md"
            />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.25em] text-amber-400">
              REPÚBLICA DE ANGOLA
            </p>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300">
              MINISTÉRIO DA EDUCAÇÃO
            </p>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight pt-1">
              {configSistema.nomeSistema || 'SGE-NG'} — Sistema de Gestão Escolar
            </h1>
          </div>
        </div>
      </header>

      {/* Formulário Central Limpo */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 space-y-5 transition-colors">
          
          <div className="text-center space-y-1">
            {/* Logótipo Oficial Sem Palavras (Apenas o Símbolo) */}
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center shadow-xs">
                <InsigniaAngola 
                  size={52} 
                  customUrl={configSistema.insigniaNacionalUrl} 
                  className="object-contain"
                />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Introduza as suas credenciais para aceder ao portal
            </p>
            {/* Indicador de Sincronização em Tempo Real (Firebase & Dispositivo) */}
            <div className="pt-1 flex items-center justify-center space-x-2 text-[10px] font-semibold">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${
                redeOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${redeOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {redeOnline ? 'Firebase Firestore (Online) · Sincronizado com Dispositivo' : 'Modo Offline: Sincronização no Dispositivo Ativa'}
              </span>
            </div>
          </div>

          {erroLogin && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erroLogin}</span>
            </div>
          )}

          <form onSubmit={handleSubmeterLogin} className="space-y-4">
            {/* Campo Armadilha Anti-Spam (Invisível para humanos) */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="sge-hp-url">Deixar em branco</label>
              <input
                id="sge-hp-url"
                name="website_url_hp"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hpTrap}
                onChange={(e) => setHpTrap(e.target.value)}
              />
            </div>

            {/* Campo E-mail / Identificador */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>E-mail ou N.º de BI</span>
              </label>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                required
                placeholder="ex: admin.geral@sge.med.gov.ao ou BI"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 transition-all font-medium"
              />
            </div>

            {/* Campo Palavra-Passe */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Palavra-passe</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowEsqueciSenha(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer transition-colors"
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 transition-all font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {desafioHumano && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
                  {desafioHumano.pergunta}
                </label>
                <input
                  type="number"
                  required
                  value={respostaDesafio}
                  onChange={(e) => setRespostaDesafio(e.target.value)}
                  placeholder="Digite o resultado numérico"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-md text-xs text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold tracking-wide uppercase flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 leading-snug pt-0.5">
              Ao aceder, concorda com a{' '}
              <button
                type="button"
                onClick={() => openLegalPolicyModal('confidencialidade')}
                className="text-blue-700 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Política de Confidencialidade
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => openLegalPolicyModal('privacidade')}
                className="text-blue-700 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Privacidade
              </button>{' '}
              e os{' '}
              <button
                type="button"
                onClick={() => openLegalPolicyModal('termos')}
                className="text-blue-700 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Termos de Uso
              </button>
              .
            </p>
          </form>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold">ou</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>

          {/* Botão Consultar Educando (Para os Encarregados) */}
          <button
            type="button"
            onClick={() => setShowConsultarModal(true)}
            className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Consultar (Para os Encarregados)</span>
          </button>
        </div>
      </main>

      {/* Modal Esqueci a Senha */}
      {showEsqueciSenha && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
                <HelpCircle className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recuperação de Acesso</h3>
              </div>
              <button 
                onClick={() => { setShowEsqueciSenha(false); setMsgRecuperacao(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              De acordo com as normas de segurança do Ministério da Educação, o acesso dos funcionários é gerido centralmente.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-lg p-3 text-xs space-y-1.5 text-blue-900 dark:text-blue-200">
              <p className="font-bold">Como redefinir a sua palavra-passe:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                <li>Dirija-se à <strong>Secretaria Escolar</strong> ou ao <strong>Gabinete do Subdirector</strong> da sua instituição.</li>
                <li>Os administradores do sistema têm a prerrogativa de redefinir as credenciais diretamente no módulo de Recursos Humanos.</li>
                <li>Para contas de suporte central, utilize o contacto oficial da Direção Provincial de Educação.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowEsqueciSenha(false); setMsgRecuperacao(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consultar (Para os Encarregados) */}
      {showConsultarModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-3xl w-full rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                <GraduationCap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Portal dos Encarregados</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Consulta pública e acompanhamento do educando</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowConsultarModal(false); setAlunoConsultado(null); setErroConsulta(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePesquisarEducando} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Código de Matrícula, N.º de BI ou Nome do Educando:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={termoConsulta}
                    onChange={(e) => setTermoConsulta(e.target.value)}
                    placeholder="Ex: MAT-2025-006 ou 003847291ZE045"
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:bg-white dark:focus:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Pesquisar</span>
                  </button>
                </div>
              </div>
            </form>

            {erroConsulta && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>{erroConsulta}</span>
              </div>
            )}

            {/* Resultado da Consulta Enriquecido */}
            {alunoConsultado && (
              <div className="space-y-4">
                <React.Suspense
                  fallback={
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      A carregar boletim do aluno...
                    </div>
                  }
                >
                  <ParentStudentReportView
                    aluno={alunoConsultado}
                    escola={escolas.find(e => e.id === alunoConsultado.escolaId) || selectedEscola}
                    modoModal={false}
                  />
                </React.Suspense>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Deseja aceder a todas as opções interativas e comunicados do educando?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEntrarComoEncarregado(alunoConsultado)}
                    className="w-full sm:w-auto py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <span>Entrar no Painel do Educando</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowConsultarModal(false); setAlunoConsultado(null); setErroConsulta(null); }}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Oficial da Aplicação com Copyright, Ano Atual e Desenvolvedor Dite Zola NG */}
      <Footer variant="dark" />
    </div>
  );
};
