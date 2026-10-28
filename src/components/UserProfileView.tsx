import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Lock, 
  Camera, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Building2, 
  Key, 
  Eye, 
  EyeOff,
  Sparkles,
  Upload
} from 'lucide-react';
import { Funcionario, Escola } from '../types';
import { dbService } from '../services/storage';

interface UserProfileViewProps {
  currentUser: Funcionario;
  escola?: Escola;
  onProfileUpdated?: (updatedUser: Funcionario) => void;
  onSalvarPerfil?: (updatedUser: Funcionario) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  escola,
  onProfileUpdated,
  onSalvarPerfil
}) => {
  const [nomeCompleto, setNomeCompleto] = useState(currentUser.nomeCompleto);
  const [email, setEmail] = useState(currentUser.email || '');
  const [telefone, setTelefone] = useState(currentUser.telefone || '');
  const [habilitacoes, setHabilitacoes] = useState(currentUser.habilitacoes || 'Licenciatura');
  const [genero, setGenero] = useState<'M' | 'F'>(currentUser.genero || 'M');
  const [fotoUrl, setFotoUrl] = useState(currentUser.fotoUrl || '');
  
  // Senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estados de feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);


  const handleSalvarPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemSucesso(null);
    setMensagemErro(null);

    if (!nomeCompleto.trim()) {
      setMensagemErro('O nome completo é obrigatório.');
      return;
    }

    if (novaSenha) {
      if (novaSenha.length < 6) {
        setMensagemErro('A nova palavra-passe deve conter pelo menos 6 caracteres.');
        return;
      }
      if (novaSenha !== confirmarSenha) {
        setMensagemErro('A confirmação da nova palavra-passe não coincide.');
        return;
      }
      const senhaValida = currentUser.password || '';
      if (senhaValida && senhaAtual && senhaAtual !== senhaValida) {
        setMensagemErro('A palavra-passe atual indicada está incorreta.');
        return;
      }
    }

    setSalvando(true);

    try {
      const atualizacoes: Partial<Funcionario> = {
        nomeCompleto: nomeCompleto.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        habilitacoes,
        genero,
        fotoUrl: fotoUrl.trim()
      };

      if (novaSenha) {
        atualizacoes.password = novaSenha;
      }

      const resultado = dbService.atualizarPerfilUtilizador(currentUser.id, atualizacoes);
      
      if (resultado.sucesso && resultado.usuarioAtualizado) {
        (onProfileUpdated || onSalvarPerfil)?.(resultado.usuarioAtualizado);
        setMensagemSucesso('Perfil atualizado com sucesso! As alterações já estão ativas.');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
      } else {
        setMensagemErro(resultado.mensagem || 'Não foi possível atualizar o perfil. Tente novamente.');
      }
    } catch (err: any) {
      setMensagemErro('Erro ao salvar alterações: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setSalvando(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMensagemErro('A imagem selecionada excede o limite recomendado de 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
        setMensagemSucesso('Foto carregada. Clique em "Guardar Alterações" para confirmar.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            {fotoUrl && fotoUrl.trim() !== '' ? (
              <img 
                src={fotoUrl} 
                alt={currentUser.nomeCompleto} 
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl border-2 border-blue-200 shadow-sm">
                {currentUser.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            )}
            <label 
              htmlFor="upload-avatar" 
              className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition-transform transform active:scale-95"
              title="Carregar nova fotografia"
            >
              <Camera className="w-3.5 h-3.5" />
              <input 
                id="upload-avatar" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-gray-900">{currentUser.nomeCompleto}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-full">
                {currentUser.cargo || currentUser.role}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center space-x-2">
              <span>BI: <strong>{currentUser.numeroBI}</strong></span>
              <span>•</span>
              <span>{escola?.nomeOficial || 'Ministério da Educação / Administração Geral'}</span>
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                <span>Conta Autenticada</span>
              </span>
              <span className="text-[10px] text-gray-400">
                Acesso seguro e estrito por perfil
              </span>
            </div>
          </div>
        </div>

        <div className="text-left md:text-right bg-gray-50 p-3 rounded-xl border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Instituição Ativa</span>
          <span className="text-xs font-bold text-gray-800 block truncate max-w-xs">{escola?.nomeOficial || 'Administração Geral'}</span>
          <span className="text-[10px] text-gray-500 block">Ano Lectivo: <strong>{escola?.anoLectivoActivo || '2025/2026'}</strong></span>
        </div>
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSalvarPerfil} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Informações Pessoais & Contactos</span>
              </h2>
              <p className="text-[11px] text-gray-500">Mantenha os seus dados institucionais e contactos sempre atualizados.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Número do Bilhete de Identidade (BI)
              </label>
              <input 
                type="text" 
                value={currentUser.numeroBI}
                readOnly
                disabled
                className="w-full text-xs font-medium px-3 py-2 border border-gray-200 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed"
                title="O número do BI é a chave de identificação única e apenas pode ser retificado pelo administrador."
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Identificador fixo registado no MED.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Correio Electrónico (E-mail)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utilizador@escola.med.gov.ao"
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Contacto Telefónico
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+244 923 000 000"
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Habilitações Literárias
              </label>
              <select
                value={habilitacoes}
                onChange={(e) => setHabilitacoes(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="Ensino Médio">Ensino Médio Concluído</option>
                <option value="Bacharelato">Bacharelato</option>
                <option value="Licenciatura">Licenciatura</option>
                <option value="Pós-Graduação">Pós-Graduação</option>
                <option value="Mestrado">Mestrado</option>
                <option value="Doutoramento">Doutoramento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Género
              </label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value as 'M' | 'F')}
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fotografia de Perfil */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Fotografia de Perfil & Avatar Oficial</span>
              </h2>
              <p className="text-[11px] text-gray-500">Insira um link direto de imagem ou escolha entre os modelos oficiais sugeridos.</p>
            </div>
          </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                URL da Fotografia ou Carregamento Direto
              </label>
              <div className="flex gap-2">
                <input 
                  type="url" 
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://exemplo.com/minha-foto.jpg ou carregue ficheiro"
                  className="flex-1 text-xs font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 shrink-0 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Carregar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setFotoUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl('')}
                    className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
        </div>

        {/* Segurança e Alteração de Palavra-passe */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Segurança & Alteração de Palavra-passe</span>
              </h2>
              <p className="text-[11px] text-gray-500">Preencha apenas se desejar alterar as suas credenciais de acesso.</p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
            >
              {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{mostrarSenha ? 'Ocultar' : 'Visualizar'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Palavra-passe Atual
              </label>
              <input 
                type={mostrarSenha ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Insira a atual"
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nova Palavra-passe
              </label>
              <input 
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo de 6 dígitos"
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Confirmar Nova Palavra-passe
              </label>
              <input 
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova palavra-passe"
                className="w-full text-xs font-medium px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Registo de Retificações de Notas pela Direção Geral / Subdireção */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Avisos & Retificações de Notas pela Direção Geral</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Registo forense oficial de todas as notas alteradas ou adicionadas pela Direção para turmas sob a sua lecionação.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-800 font-bold rounded-lg border border-purple-200">
              {dbService.getRegistosAlteracoesNotas(currentUser.id, escola?.id).length} Registo(s)
            </span>
          </div>

          {(() => {
            const logsProf = dbService.getRegistosAlteracoesNotas(currentUser.id, escola?.id);
            if (logsProf.length === 0) {
              return (
                <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-gray-800">Nenhuma retificação de nota registada pela Direção</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Todas as avaliações lançadas permanecem exatamente com os valores atribuídos na pauta.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {logsProf.map((reg) => (
                  <div key={reg.id} className="p-3.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-purple-100 pb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-purple-700 text-white rounded text-[10px] font-black">
                          {reg.tipoNota}
                        </span>
                        <strong className="text-gray-900">{reg.alunoNome}</strong>
                        <span className="text-gray-500 text-[11px]">({reg.turmaNome} • {reg.classe} {reg.curso ? `- ${reg.curso}` : ''})</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{reg.dataHora}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 text-[11px]">
                      <div>
                        <span className="text-gray-500 block">Disciplina:</span>
                        <strong className="text-gray-800">{reg.disciplinaNome} ({reg.trimestre}º Trimestre)</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Ajuste de Classificação:</span>
                        <span className="font-mono font-bold text-red-600 line-through mr-1.5">{reg.notaAnterior}</span>
                        <span className="font-mono font-black text-emerald-700 text-xs">→ {reg.novaNota}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Autoridade que Homologou:</span>
                        <strong className="text-purple-900">{reg.alteradoPorNome} ({reg.alteradoPorRole})</strong>
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-purple-100 text-[11px] text-gray-700">
                      <strong>Fundamentação Oficial:</strong> {reg.motivoJustificativa}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Botão de Gravação */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{salvando ? 'A Guardar...' : 'Guardar Alterações do Perfil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
