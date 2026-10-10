import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  Database
} from 'lucide-react';
import { Funcionario } from '../types';
import { dbService } from '../services/storage';
import { cryptoService } from '../services/cryptoService';
import { securityEngine } from '../services/securityEngine';

interface SystemInitialSetupViewProps {
  onSetupConcluido: (admin: Funcionario) => void;
}

export const SystemInitialSetupView: React.FC<SystemInitialSetupViewProps> = ({
  onSetupConcluido
}) => {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [isProcessando, setIsProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Status Criptográfico e de Rede ao Vivo
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [cryptoStatus, setCryptoStatus] = useState(cryptoService.getStatus());
  const [senhaCifradaPreview, setSenhaCifradaPreview] = useState<string>('');
  const [hashPreview, setHashPreview] = useState<string>('');

  // 1. Dados do Administrador Geral
  const [adminNome, setAdminNome] = useState('Dr. Eng. Alberto Domingos Kwanza');
  const [adminEmail, setAdminEmail] = useState('admin.geral@sge.med.gov.ao');
  const [adminTelefone, setAdminTelefone] = useState('+244 923 000 111');
  const [adminBI, setAdminBI] = useState('001928374LA049');
  const [adminSenha, setAdminSenha] = useState('Admin@2025');
  const [adminConfirmarSenha, setAdminConfirmarSenha] = useState('Admin@2025');
  const [adminHabilitacoes, setAdminHabilitacoes] = useState('Mestrado em Engenharia Informática & Gestão de Sistemas Educativos (MED)');

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simular em tempo real a pré-cifragem da senha em AES-256
  useEffect(() => {
    let ativo = true;
    const atualizarPrevia = async () => {
      if (!adminSenha) {
        setSenhaCifradaPreview('');
        setHashPreview('');
        return;
      }
      try {
        const cifrado = await cryptoService.encriptarTexto(adminSenha);
        const hash = await cryptoService.calcularSHA256(adminSenha);
        if (ativo) {
          setSenhaCifradaPreview(cifrado);
          setHashPreview(hash);
        }
      } catch {
        // Ignora
      }
    };
    atualizarPrevia();
    return () => { ativo = false; };
  }, [adminSenha]);

  const validarEtapa1 = () => {
    if (!adminNome.trim() || !adminEmail.trim() || !adminBI.trim()) {
      setErro('Por favor, preencha todos os campos obrigatórios do Administrador Geral.');
      return false;
    }
    if (adminSenha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres para assegurar a blindagem criptográfica.');
      return false;
    }
    if (adminSenha !== adminConfirmarSenha) {
      setErro('A confirmação da senha não coincide com a senha digitada.');
      return false;
    }
    setErro(null);
    return true;
  };

  const handleAvancarParaEtapa2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validarEtapa1()) {
      setEtapa(2);
    }
  };

  const handleConcluirSetupFinal = async () => {
    setIsProcessando(true);
    setErro(null);

    try {
      const dadosAdmin: Partial<Funcionario> = {
        nomeCompleto: adminNome.trim(),
        email: adminEmail.trim(),
        telefone: adminTelefone.trim(),
        numeroBI: adminBI.trim().toUpperCase(),
        cargo: 'Administrador Geral do Sistema',
        role: 'AdminGeral',
        escolaId: 'todas',
        habilitacoes: adminHabilitacoes,
        ativo: true,
        password: adminSenha
      };

      // Executa o setup com cifragem AES-256 e gravação do Master Lock
      // O Administrador Geral não depende de nenhuma escola
      const adminCriado = await dbService.concluirSetupInicial(dadosAdmin);

      // Regista log no motor de segurança
      securityEngine.registarEvento({
        categoria: 'SISTEMA',
        severidade: 'SUCESSO',
        titulo: 'Sistema SGE-NG Inicializado com Sucesso',
        detalhes: `Administrador Geral ${adminCriado.nomeCompleto} ativado sem dependência de escola. Master-Lock antifraude e chave AES-256 operacionais.`
      });

      setSucesso(true);
      setTimeout(() => {
        onSetupConcluido(adminCriado);
      }, 1500);
    } catch (err: any) {
      setErro(err?.message || 'Falha crítica ao gravar a configuração inicial do sistema.');
      setIsProcessando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 text-slate-800 overflow-hidden my-6">
        
        {/* Top Header Institucional da República de Angola */}
        <div className="bg-gradient-to-r from-red-700 via-yellow-600 to-amber-700 px-6 py-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/20 shadow-md">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-white/10 p-1.5 flex items-center justify-center border border-white/30 shadow-inner">
              <ShieldCheck className="w-8 h-8 text-yellow-300" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-yellow-200 block">
                República de Angola • Ministério da Educação
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                SGE-NG • Ativação Inicial do Sistema
              </h1>
              <span className="text-xs text-white/90 font-medium">
                Registo do Administrador Geral Ministerial & Blindagem Criptográfica AES-256
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isOnline 
                ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40' 
                : 'bg-amber-500/20 text-amber-100 border-amber-400/40'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isOnline ? 'Online (Firebase Pronto)' : 'Modo Offline Ativo'}</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/40 text-indigo-100 border border-indigo-300/30">
              <Cpu className="w-3.5 h-3.5 text-indigo-300" />
              <span>AES-256 WebCrypto</span>
            </div>
          </div>
        </div>

        {/* Stepper Visual de 2 Etapas */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className={`flex items-center space-x-2 text-xs font-bold ${etapa >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${etapa >= 1 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
                1
              </div>
              <span>Registo do Administrador Geral</span>
            </div>
            <div className={`h-0.5 flex-1 mx-4 ${etapa >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center space-x-2 text-xs font-bold ${etapa >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${etapa >= 2 ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
                2
              </div>
              <span>Blindagem AES-256 & Ativação</span>
            </div>
          </div>
        </div>

        {/* Mensagens de Alerta / Erro */}
        {erro && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm flex items-center space-x-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">Sistema Ativado & Administrador Geral Registado!</span>
              <span className="text-xs text-emerald-700">A redirecionar com segurança para a consola ministerial central...</span>
            </div>
          </div>
        )}

        {/* Conteúdo das Etapas */}
        <div className="p-6 sm:p-8">

          {/* ========================================================= */}
          {/* ETAPA 1: REGISTO DO ADMINISTRADOR GERAL                   */}
          {/* ========================================================= */}
          {etapa === 1 && (
            <form onSubmit={handleAvancarParaEtapa2} className="space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-indigo-700">
                  <User className="w-5 h-5" />
                  <h2 className="text-lg font-bold">1. Credenciais do Administrador Geral</h2>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl mt-2 text-xs text-blue-900">
                  <strong>Aviso Institucional do MED:</strong> O Administrador Geral opera no nível macro executivo nacional. 
                  <strong> Não necessita nem depende do cadastro prévio de uma escola.</strong> O cadastro das escolas da rede e a nomeação de Diretores Gerais é realizado posteriormente a partir do Painel Central Ministerial.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo do Administrador Geral *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={adminNome}
                      onChange={e => setAdminNome(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                      placeholder="Ex: Dr. Eng. Alberto Domingos Kwanza"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bilhete de Identidade (BI de Angola) *
                  </label>
                  <div className="relative">
                    <FileCheck2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={adminBI}
                      onChange={e => setAdminBI(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 uppercase font-mono"
                      placeholder="Ex: 001928374LA049"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correio Electrónico Institucional (E-mail) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 font-mono text-indigo-700"
                      placeholder="admin.geral@sge.med.gov.ao"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contacto Telefónico Oficial
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={adminTelefone}
                      onChange={e => setAdminTelefone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                      placeholder="+244 923 000 111"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Habilitações Acadêmicas & Perfil Ministerial
                  </label>
                  <input
                    type="text"
                    value={adminHabilitacoes}
                    onChange={e => setAdminHabilitacoes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                    placeholder="Mestrado em Engenharia Informática & Gestão Escolar MED"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Palavra-passe de Acesso Inicial *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      value={adminSenha}
                      onChange={e => setAdminSenha(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 font-mono"
                      placeholder="Mínimo de 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirmar Palavra-passe *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      value={adminConfirmarSenha}
                      onChange={e => setAdminConfirmarSenha(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 font-mono"
                      placeholder="Digite a mesma senha"
                    />
                  </div>
                </div>
              </div>

              {/* Pré-visualização da Blindagem Criptográfica AES-256 */}
              {senhaCifradaPreview && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] font-mono space-y-1">
                  <div className="flex items-center space-x-1.5 text-indigo-700 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Enclave Criptográfico AES-256 Ativo (Visualização Prévia):</span>
                  </div>
                  <div className="truncate text-slate-600">
                    <span className="text-slate-400">Ciphertext: </span>
                    {senhaCifradaPreview}
                  </div>
                  <div className="truncate text-slate-500">
                    <span className="text-slate-400">SHA-256 Digest: </span>
                    {hashPreview}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <span>Avançar para Ativação & Blindagem</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* ETAPA 2: BLINDAGEM AES-256 & ATIVAÇÃO DO SISTEMA         */}
          {/* ========================================================= */}
          {etapa === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-indigo-700">
                  <Cpu className="w-5 h-5" />
                  <h2 className="text-lg font-bold">2. Blindagem Criptográfica & Ativação do Sistema</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Validação dos parâmetros ministeriais e ativação do Master Lock inviolável antifraude.
                </p>
              </div>

              {/* Cartão de Resumo do Administrador Geral */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 mb-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Resumo do Administrador Geral</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Nome Oficial:</span>
                    <span className="font-bold text-slate-900">{adminNome}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">E-mail de Login:</span>
                    <span className="font-mono text-indigo-700 font-bold">{adminEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bilhete de Identidade:</span>
                    <span className="font-mono text-slate-800">{adminBI}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Âmbito de Atuação:</span>
                    <span className="font-bold text-emerald-700">Nacional (Todas as Escolas)</span>
                  </div>
                </div>
              </div>

              {/* Protocolo de Segurança e Criptografia */}
              <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl shadow-inner space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-700/50 pb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-200">
                    <KeyRound className="w-4 h-4 text-yellow-400" />
                    <span>Blindagem AES-256-GCM & Master Lock</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Pronto para Ativação
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Algoritmo Criptográfico</span>
                    <span className="font-mono font-bold text-white">{cryptoStatus.algorithm}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chave Mestre Derivada</span>
                    <span className="font-mono font-bold text-yellow-300">PBKDF2-SHA256 (100k)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Aceleração por Hardware</span>
                    <span className="font-mono font-bold text-emerald-400">WebCrypto API Ativa</span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-300 border-t border-indigo-800/60 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p>
                    Ao ativar o sistema, a flag de configuração do Administrador Geral é permanentemente gravada no enclave. 
                    Nenhuma escola é requerida neste momento, preservando a autonomia ministerial.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  disabled={isProcessando}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleConcluirSetupFinal}
                  disabled={isProcessando}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isProcessando ? (
                    <span>A Ativar Enclave & Master Lock...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-200" />
                      <span>Ativar Sistema & Inicializar Master Lock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
