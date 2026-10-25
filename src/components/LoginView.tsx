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
  Calendar
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
  const todosAlunos = dbService.getAlunos();

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

    const handleOnline = () => setRedeOnline(true);
    const handleOffline = () => setRedeOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      ativo = false;
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

  const handleSubmeterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin(null);

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

      // Se não encontrou no Firebase ou offline, verificar na lista carregada em memória/dispositivo
      if (!utilizadorEncontrado) {
        const funcsFrescos = dbService.getFuncionarios();
        const idSemEspaco = idLimpo.replace(/\s+/g, '');
        utilizadorEncontrado = funcsFrescos.find(f => {
          const fEmail = (f.email || '').trim().toLowerCase();
          const fBi = (f.numeroBI || '').toLowerCase().replace(/\s+/g, '');
          const fNome = (f.nomeCompleto || '').toLowerCase();
          return fEmail === idLimpo ||
                 fBi === idSemEspaco ||
                 fNome === idLimpo ||
                 fNome.includes(idLimpo) ||
                 (ehAdminGeral && f.role === 'AdminGeral');
        }) || null;
      }

      // Se ainda não encontrado, permitir fallback de admin se credencial bater com admin
      if (!utilizadorEncontrado) {
        const funcsTodos = dbService.getFuncionarios();
        if (idLimpo.includes('admin') || ehAdminGeral) {
          utilizadorEncontrado = funcsTodos.find(f => f.role === 'AdminGeral') || null;
        }
      }

      const ehRealmenteAdminGeral = ehAdminGeral || (utilizadorEncontrado?.role === 'AdminGeral');

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

      const escolaParaLogin = selectedEscola || escolas[0] || dbService.getEscolaAtiva();
      setIsLoading(false);
      onLogin(utilizadorEncontrado, escolaParaLogin, selectedAno || escolaParaLogin.anoLectivoActivo || '2025/2026');
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

    const termo = sanitizeSearchInput(termoConsulta, 60).toLowerCase();
    if (!termo) {
      setErroConsulta('Introduza o Código de Matrícula ou Número do BI do educando.');
      return;
    }

    const aluno = todosAlunos.find(a => 
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative">
      {/* Luz ambiente suave */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

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
        <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
          
          <div className="text-center space-y-1">
            {/* Logótipo Oficial Sem Palavras (Apenas o Símbolo) */}
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 inline-flex items-center justify-center shadow-xs">
                <InsigniaAngola 
                  size={52} 
                  customUrl={configSistema.insigniaNacionalUrl} 
                  className="object-contain"
                />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Introduza as suas credenciais para aceder ao portal
            </p>
            {/* Indicador de Sincronização em Tempo Real (Firebase & Dispositivo) */}
            <div className="pt-1 flex items-center justify-center space-x-2 text-[10px] font-semibold">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${
                redeOnline ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${redeOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {redeOnline ? 'Firebase Firestore (Online) · Sincronizado com Dispositivo' : 'Modo Offline: Sincronização no Dispositivo Ativa'}
              </span>
            </div>
          </div>

          {erroLogin && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erroLogin}</span>
            </div>
          )}

          <form onSubmit={handleSubmeterLogin} className="space-y-4">
            {/* Campo E-mail / Identificador */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span>E-mail ou N.º de BI</span>
              </label>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                required
                placeholder="ex: admin.geral@sge.med.gov.ao ou BI"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 transition-all font-medium"
              />
            </div>

            {/* Campo Palavra-Passe */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Palavra-passe</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowEsqueciSenha(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer transition-colors"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 transition-all font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

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
          </form>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase font-semibold">ou</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Botão Consultar Educando (Para os Encarregados) */}
          <button
            type="button"
            onClick={() => setShowConsultarModal(true)}
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Search className="h-4 w-4 text-emerald-600" />
            <span>Consultar (Para os Encarregados)</span>
          </button>
        </div>
      </main>

      {/* Modal Esqueci a Senha */}
      {showEsqueciSenha && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-700">
                <HelpCircle className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">Recuperação de Acesso</h3>
              </div>
              <button 
                onClick={() => { setShowEsqueciSenha(false); setMsgRecuperacao(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              De acordo com as normas de segurança do Ministério da Educação, o acesso dos funcionários é gerido centralmente.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1.5 text-blue-900">
              <p className="font-bold">Como redefinir a sua palavra-passe:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>Dirija-se à <strong>Secretaria Escolar</strong> ou ao <strong>Gabinete do Subdirector</strong> da sua instituição.</li>
                <li>Os administradores do sistema têm a prerrogativa de redefinir as credenciais diretamente no módulo de Recursos Humanos.</li>
                <li>Para contas de suporte central, utilize o contacto oficial da Direção Provincial de Educação.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowEsqueciSenha(false); setMsgRecuperacao(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
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
          <div className="bg-white text-slate-900 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-emerald-700">
                <GraduationCap className="h-6 w-6 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Portal dos Encarregados</h3>
                  <p className="text-[11px] text-slate-500">Consulta pública e acompanhamento do educando</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowConsultarModal(false); setAlunoConsultado(null); setErroConsulta(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePesquisarEducando} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Matrícula, N.º de BI ou Nome do Educando:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={termoConsulta}
                    onChange={(e) => setTermoConsulta(e.target.value)}
                    placeholder="Ex: MAT-2025-006 ou 003847291ZE045"
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Pesquisar</span>
                  </button>
                </div>
              </div>
            </form>

            {erroConsulta && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{erroConsulta}</span>
              </div>
            )}

            {/* Resultado da Consulta */}
            {alunoConsultado && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-800 font-bold overflow-hidden shrink-0">
                      {alunoConsultado.fotoUrl ? (
                        <img src={alunoConsultado.fotoUrl} alt={alunoConsultado.nomeCompleto} className="h-full w-full object-cover" />
                      ) : (
                        alunoConsultado.nomeCompleto.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{alunoConsultado.nomeCompleto}</h4>
                      <p className="text-[11px] text-slate-600">
                        Processo: <span className="font-mono font-bold text-slate-800">{alunoConsultado.codigoMatricula}</span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Turma: <span className="font-bold text-slate-800">{alunoConsultado.classeId} Classe</span>
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    alunoConsultado.estado === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {alunoConsultado.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Encarregado Declarado:</span>
                    <span className="font-bold text-slate-800">{alunoConsultado.nomeEncarregado || 'Não especificado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Contacto do Encarregado:</span>
                    <span className="font-bold text-slate-800">{alunoConsultado.telefoneEncarregado || 'Não especificado'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEntrarComoEncarregado(alunoConsultado)}
                    className="w-full py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
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
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
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
