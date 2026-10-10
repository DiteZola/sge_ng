import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Lock, 
  CheckCircle2, 
  X,
  AlertCircle,
  Cpu,
  Sparkles
} from 'lucide-react';
import { Escola, Funcionario } from '../types';

interface InitialSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSetup: (dadosAdmin: Partial<Funcionario>, dadosEscola?: Partial<Escola>) => void;
  escolasExistentes?: Escola[];
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  onClose,
  onSaveSetup
}) => {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Form Administrador Geral
  const [adminNome, setAdminNome] = useState('Dr. Eng. Alberto Domingos Kwanza');
  const [adminEmail, setAdminEmail] = useState('admin.geral@sge.med.gov.ao');
  const [adminTelefone, setAdminTelefone] = useState('+244 923 000 111');
  const [adminBI, setAdminBI] = useState('001928374LA049');
  const [adminSenha, setAdminSenha] = useState('Admin@2025');
  const [adminConfirmarSenha, setAdminConfirmarSenha] = useState('Admin@2025');

  if (!isOpen) return null;

  const handleConcluir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNome.trim() || !adminEmail.trim() || !adminBI.trim()) {
      setErro('Por favor preencha todos os campos obrigatórios do Administrador Geral.');
      return;
    }
    if (adminSenha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres para assegurar a blindagem criptográfica.');
      return;
    }
    if (adminSenha !== adminConfirmarSenha) {
      setErro('A senha e a confirmação de senha não coincidem.');
      return;
    }

    setErro(null);
    setSalvando(true);

    try {
      const dadosAdmin: Partial<Funcionario> = {
        nomeCompleto: adminNome.trim(),
        email: adminEmail.trim(),
        telefone: adminTelefone.trim(),
        numeroBI: adminBI.trim().toUpperCase(),
        cargo: 'Administrador Geral do Sistema',
        role: 'AdminGeral',
        escolaId: 'todas',
        password: adminSenha,
        ativo: true
      };

      // O cadastro do administrador geral não precisa de cadastrar nenhuma escola
      onSaveSetup(dadosAdmin);
      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        setSalvando(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao gravar configuração inicial.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
        {/* Cabeçalho do Assistente */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/20">
              <ShieldCheck className="h-8 w-8 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase block">
                República de Angola • Ministério da Educação
              </span>
              <h2 className="text-xl font-black">Cadastro do Administrador Geral</h2>
              <p className="text-xs text-blue-200">
                Ativação do Sistema SGE-NG e Enclave de Criptografia AES-256
              </p>
            </div>
          </div>
        </div>

        {/* Notificações de Erro / Sucesso */}
        {erro && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Administrador Geral ativado com sucesso! Sistema pronto para operação institucional.</span>
          </div>
        )}

        {/* Formulário Direto sem Dependência de Escola */}
        <div className="p-6">
          <form onSubmit={handleConcluir} className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-950 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-indigo-900">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Independência Institucional do Administrador Geral</span>
              </div>
              <p className="leading-relaxed text-indigo-900/90 text-[11px]">
                O cadastro do Administrador Geral <strong>não depende de nenhuma escola</strong>. Ele opera com soberania nacional no Ministério da Educação (MED) para gerir toda a rede de instituições, nomear diretores e auditar os registos com cifragem militar AES-256.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-800 flex items-center space-x-1">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Nome Completo do Administrador Geral *</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminNome}
                  onChange={(e) => setAdminNome(e.target.value)}
                  placeholder="Ex: Dr. Alberto Kwanza"
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm text-gray-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-800 flex items-center space-x-1">
                  <Mail className="h-3.5 w-3.5 text-indigo-600" />
                  <span>E-mail Institucional *</span>
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin.geral@med.gov.ao"
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm text-gray-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-800 flex items-center space-x-1">
                  <Phone className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Telefone Institucional *</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminTelefone}
                  onChange={(e) => setAdminTelefone(e.target.value)}
                  placeholder="+244 923 000 111"
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm text-gray-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-800 flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Nº do Bilhete de Identidade (BI) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminBI}
                  onChange={(e) => setAdminBI(e.target.value)}
                  placeholder="001928374LA049"
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl uppercase font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm text-gray-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-800 flex items-center space-x-1">
                  <Lock className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Palavra-passe Mestre *</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminSenha}
                  onChange={(e) => setAdminSenha(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm text-gray-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-800 flex items-center space-x-1">
                  <Lock className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Confirmar Palavra-passe *</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminConfirmarSenha}
                  onChange={(e) => setAdminConfirmarSenha(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm text-gray-900 shadow-2xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <div className="flex items-center space-x-1.5 text-[11px] text-gray-500">
                <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                <span>Chave AES-256 PBKDF2</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{salvando ? 'Ativando...' : 'Ativar Sistema & Cadastrar Admin'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
