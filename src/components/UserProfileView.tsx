import React, { useState, useEffect } from 'react';
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
  Upload,
  Sun,
  Moon,
  Monitor,
  Plus,
  Trash2
} from 'lucide-react';
import {
  Funcionario,
  Escola,
  FormacaoAcademicaExtra,
  CampoPersonalizadoFuncionario
} from '../types';
import { dbService } from '../services/storage';
import { processarFotoUpload } from '../utils/imageCompressor';
import { firebaseSyncEngine } from '../services/firebaseSyncEngine';
import { cryptoService } from '../services/cryptoService';
import { useTheme, ThemeMode } from '../services/themeService';

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
  const [numeroBI, setNumeroBI] = useState(currentUser.numeroBI || '');
  const [dataEmissaoBI, setDataEmissaoBI] = useState(currentUser.dataEmissaoBI || '');
  const [validadeBI, setValidadeBI] = useState(currentUser.validadeBI || currentUser.dataValidadeBI || '');
  const [localEmissaoBI, setLocalEmissaoBI] = useState(currentUser.localEmissaoBI || currentUser.arquivoIdentificacao || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [telefone, setTelefone] = useState(currentUser.telefone || '');
  const [telefoneAlternativo, setTelefoneAlternativo] = useState(currentUser.telefoneAlternativo || '');
  const [habilitacoes, setHabilitacoes] = useState(currentUser.habilitacoes || currentUser.grauAcademico || 'Licenciatura');
  const [grauAcademico, setGrauAcademico] = useState(currentUser.grauAcademico || 'Licenciatura');
  const [instituicaoAcademica, setInstituicaoAcademica] = useState(currentUser.instituicaoAcademica || '');
  const [anoConclusaoFormacao, setAnoConclusaoFormacao] = useState(currentUser.anoConclusaoFormacao || '');
  const [outrasFormacoes, setOutrasFormacoes] = useState<FormacaoAcademicaExtra[]>(
    Array.isArray(currentUser.outrasFormacoes) ? currentUser.outrasFormacoes : []
  );
  const [camposExtrasFormacao, setCamposExtrasFormacao] = useState<CampoPersonalizadoFuncionario[]>(
    Array.isArray(currentUser.camposExtrasFormacao) ? currentUser.camposExtrasFormacao : []
  );
  const [especialidade, setEspecialidade] = useState(currentUser.especialidade || '');
  const [categoriaProfissional, setCategoriaProfissional] = useState(currentUser.categoriaProfissional || '');
  const [numeroAgente, setNumeroAgente] = useState(currentUser.numeroAgente || '');
  const [nif, setNif] = useState(currentUser.nif || '');
  const [tipoContrato, setTipoContrato] = useState(currentUser.tipoContrato || 'Quadro Definitivo');
  const [situacaoFuncional, setSituacaoFuncional] = useState(currentUser.situacaoFuncional || 'Ativo');
  const [dataAdmissao, setDataAdmissao] = useState(currentUser.dataAdmissao || '');
  const [cargaHorariaSemanal, setCargaHorariaSemanal] = useState(currentUser.cargaHorariaSemanal ? String(currentUser.cargaHorariaSemanal) : '');
  const [departamento, setDepartamento] = useState(currentUser.departamento || '');
  const [genero, setGenero] = useState<'M' | 'F'>(currentUser.genero || 'M');
  const [dataNascimento, setDataNascimento] = useState(currentUser.dataNascimento || '');
  const [naturalidade, setNaturalidade] = useState(currentUser.naturalidade || currentUser.naturalidadeMunicipio || '');
  const [provinciaOrigem, setProvinciaOrigem] = useState(currentUser.provinciaOrigem || currentUser.provincia || '');
  const [municipioResidencia, setMunicipioResidencia] = useState(currentUser.municipioResidencia || currentUser.municipio || '');
  const [nacionalidade, setNacionalidade] = useState(currentUser.nacionalidade || 'Angolana');
  const [estadoCivil, setEstadoCivil] = useState(currentUser.estadoCivil || 'Solteiro(a)');
  const [nomePai, setNomePai] = useState(currentUser.nomePai || '');
  const [nomeMae, setNomeMae] = useState(currentUser.nomeMae || '');
  const [residenciaAtual, setResidenciaAtual] = useState(currentUser.residenciaAtual || currentUser.residencia || '');
  const [banco, setBanco] = useState(currentUser.banco || '');
  const [iban, setIban] = useState(currentUser.iban || '');
  const [numeroINSS, setNumeroINSS] = useState(currentUser.numeroINSS || currentUser.numeroSegurancaSocial || '');
  const [grupoSanguineo, setGrupoSanguineo] = useState(currentUser.grupoSanguineo || '');
  const [alergias, setAlergias] = useState(currentUser.alergias || '');
  const [doencasCronicas, setDoencasCronicas] = useState(currentUser.doencasCronicas || '');
  const [contactoEmergenciaNome, setContactoEmergenciaNome] = useState(currentUser.contactoEmergenciaNome || '');
  const [contactoEmergenciaTelefone, setContactoEmergenciaTelefone] = useState(currentUser.contactoEmergenciaTelefone || '');
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
  const [comprimindoFoto, setComprimindoFoto] = useState(false);
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  const podeEditarBIeLaboral = ['DiretorGeral', 'AdminGeral', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'ChefeSecretaria'].includes(currentUser.role);

  useEffect(() => {
    setNomeCompleto(currentUser.nomeCompleto);
    setNumeroBI(currentUser.numeroBI || '');
    setDataEmissaoBI(currentUser.dataEmissaoBI || '');
    setValidadeBI(currentUser.validadeBI || currentUser.dataValidadeBI || '');
    setLocalEmissaoBI(currentUser.localEmissaoBI || currentUser.arquivoIdentificacao || '');
    setEmail(currentUser.email || '');
    setTelefone(currentUser.telefone || '');
    setTelefoneAlternativo(currentUser.telefoneAlternativo || '');
    setHabilitacoes(currentUser.habilitacoes || currentUser.grauAcademico || 'Licenciatura');
    setGrauAcademico(currentUser.grauAcademico || 'Licenciatura');
    setInstituicaoAcademica(currentUser.instituicaoAcademica || '');
    setAnoConclusaoFormacao(currentUser.anoConclusaoFormacao || '');
    setOutrasFormacoes(Array.isArray(currentUser.outrasFormacoes) ? currentUser.outrasFormacoes : []);
    setCamposExtrasFormacao(Array.isArray(currentUser.camposExtrasFormacao) ? currentUser.camposExtrasFormacao : []);
    setEspecialidade(currentUser.especialidade || '');
    setCategoriaProfissional(currentUser.categoriaProfissional || '');
    setNumeroAgente(currentUser.numeroAgente || '');
    setNif(currentUser.nif || '');
    setTipoContrato(currentUser.tipoContrato || 'Quadro Definitivo');
    setSituacaoFuncional(currentUser.situacaoFuncional || 'Ativo');
    setDataAdmissao(currentUser.dataAdmissao || '');
    setCargaHorariaSemanal(currentUser.cargaHorariaSemanal ? String(currentUser.cargaHorariaSemanal) : '');
    setDepartamento(currentUser.departamento || '');
    setGenero(currentUser.genero || 'M');
    setDataNascimento(currentUser.dataNascimento || '');
    setNaturalidade(currentUser.naturalidade || currentUser.naturalidadeMunicipio || '');
    setProvinciaOrigem(currentUser.provinciaOrigem || currentUser.provincia || '');
    setMunicipioResidencia(currentUser.municipioResidencia || currentUser.municipio || '');
    setNacionalidade(currentUser.nacionalidade || 'Angolana');
    setEstadoCivil(currentUser.estadoCivil || 'Solteiro(a)');
    setNomePai(currentUser.nomePai || '');
    setNomeMae(currentUser.nomeMae || '');
    setResidenciaAtual(currentUser.residenciaAtual || currentUser.residencia || '');
    setBanco(currentUser.banco || '');
    setIban(currentUser.iban || '');
    setNumeroINSS(currentUser.numeroINSS || currentUser.numeroSegurancaSocial || '');
    setGrupoSanguineo(currentUser.grupoSanguineo || '');
    setAlergias(currentUser.alergias || '');
    setDoencasCronicas(currentUser.doencasCronicas || '');
    setContactoEmergenciaNome(currentUser.contactoEmergenciaNome || '');
    setContactoEmergenciaTelefone(currentUser.contactoEmergenciaTelefone || '');
    setFotoUrl(currentUser.fotoUrl || '');
  }, [currentUser]);

  const handleSalvarPerfil = async (e: React.FormEvent) => {
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
      if (senhaValida && senhaAtual) {
        let senhaAtualCorreta = senhaAtual.trim() === senhaValida.trim();
        if (!senhaAtualCorreta && cryptoService.isEncriptado(senhaValida)) {
          try {
            const partes = senhaValida.split(':');
            const checksum = partes[partes.length - 1];
            if (checksum && checksum.length === 64) {
              const sha = await cryptoService.calcularSHA256(senhaAtual.trim());
              if (sha.toLowerCase() === checksum.toLowerCase()) senhaAtualCorreta = true;
            }
            if (!senhaAtualCorreta) {
              const decifrada = await cryptoService.decriptarTexto(senhaValida);
              if (decifrada && decifrada.trim() === senhaAtual.trim()) senhaAtualCorreta = true;
            }
          } catch {}
        }
        if (!senhaAtualCorreta) {
          setMensagemErro('A palavra-passe atual indicada está incorreta.');
          return;
        }
      }
    }

    setSalvando(true);

    try {
      const cargaNum = cargaHorariaSemanal.trim() ? Number(cargaHorariaSemanal) : undefined;
      const outrasLimpas: FormacaoAcademicaExtra[] = outrasFormacoes
        .filter(f => (f.nivelFormacao || '').trim() || (f.cursoOuArea || '').trim() || (f.instituicaoAcademica || '').trim())
        .map((f, i) => ({
          id: f.id || `form-${Date.now()}-${i}`,
          nivelFormacao: (f.nivelFormacao || 'Outro').trim(),
          cursoOuArea: (f.cursoOuArea || '').trim(),
          instituicaoAcademica: (f.instituicaoAcademica || '').trim(),
          anoConclusao: (f.anoConclusao || '').trim()
        }));

      const extrasLimpos = camposExtrasFormacao
        .filter(c => (c.rotulo || '').trim() || (c.valor || '').trim())
        .map((c, i) => ({
          id: c.id || `campo-${Date.now()}-${i}`,
          rotulo: (c.rotulo || `Campo ${i + 1}`).trim(),
          valor: (c.valor || '').trim()
        }));

      const atualizacoes: Partial<Funcionario> = {
        nomeCompleto: nomeCompleto.trim(),
        numeroBI: (podeEditarBIeLaboral ? numeroBI.trim() : currentUser.numeroBI) || currentUser.numeroBI,
        dataEmissaoBI: dataEmissaoBI || undefined,
        validadeBI: validadeBI || undefined,
        dataValidadeBI: validadeBI || undefined,
        localEmissaoBI: localEmissaoBI.trim() || undefined,
        email: email.trim(),
        telefone: telefone.trim(),
        telefoneAlternativo: telefoneAlternativo.trim() || undefined,
        habilitacoes,
        grauAcademico: grauAcademico.trim() || undefined,
        instituicaoAcademica: instituicaoAcademica.trim() || undefined,
        anoConclusaoFormacao: anoConclusaoFormacao.trim() || undefined,
        outrasFormacoes: outrasLimpas,
        camposExtrasFormacao: extrasLimpos,
        especialidade: especialidade.trim() || undefined,
        categoriaProfissional: categoriaProfissional.trim() || undefined,
        numeroAgente: numeroAgente.trim() || undefined,
        nif: nif.trim() || undefined,
        tipoContrato: tipoContrato || undefined,
        situacaoFuncional: situacaoFuncional || undefined,
        dataAdmissao: dataAdmissao || undefined,
        cargaHorariaSemanal: cargaNum && !isNaN(cargaNum) ? cargaNum : undefined,
        departamento: departamento.trim() || undefined,
        genero,
        dataNascimento: dataNascimento || undefined,
        naturalidade: naturalidade.trim() || undefined,
        provinciaOrigem: provinciaOrigem.trim() || undefined,
        municipioResidencia: municipioResidencia.trim() || undefined,
        nacionalidade: nacionalidade.trim() || undefined,
        estadoCivil: estadoCivil || undefined,
        nomePai: nomePai.trim() || undefined,
        nomeMae: nomeMae.trim() || undefined,
        residenciaAtual: residenciaAtual.trim() || undefined,
        banco: banco.trim() || undefined,
        iban: iban.trim() || undefined,
        numeroINSS: numeroINSS.trim() || undefined,
        grupoSanguineo: grupoSanguineo || undefined,
        alergias: alergias.trim() || undefined,
        doencasCronicas: doencasCronicas.trim() || undefined,
        contactoEmergenciaNome: contactoEmergenciaNome.trim() || undefined,
        contactoEmergenciaTelefone: contactoEmergenciaTelefone.trim() || undefined,
        fotoUrl: fotoUrl.trim()
      };

      if (novaSenha) {
        atualizacoes.password = novaSenha;
      }

      const resultado = dbService.atualizarPerfilUtilizador(
        currentUser.id,
        atualizacoes,
        novaSenha ? novaSenha.trim() : undefined,
        senhaAtual ? senhaAtual.trim() : undefined
      );
      
      if (resultado.sucesso && resultado.usuarioAtualizado) {
        const usuarioPersistido = resultado.usuarioAtualizado;
        await firebaseSyncEngine.salvarPerfilUsuario(usuarioPersistido);
        (onProfileUpdated || onSalvarPerfil)?.(usuarioPersistido);
        window.dispatchEvent(new CustomEvent('sge_dados_atualizados_remoto'));

        setMensagemSucesso('Dados completos do perfil e ficha de funcionário atualizados com sucesso!');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprimindoFoto(true);
      setMensagemErro(null);
      setMensagemSucesso(null);
      try {
        const res = await processarFotoUpload(file, 400, 0.85);
        if (res.sucesso && res.dataUrl) {
          setFotoUrl(res.dataUrl);
          setMensagemSucesso('Fotografia otimizada e pronta para guardar. Clique em "Guardar Alterações" para sincronizar com todos os dispositivos.');
        } else {
          setMensagemErro(res.erro || 'Não foi possível processar a fotografia selecionada.');
        }
      } catch (err: any) {
        setMensagemErro('Erro ao processar imagem: ' + (err.message || 'Erro desconhecido'));
      } finally {
        setComprimindoFoto(false);
        e.target.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 min-w-0">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="relative group shrink-0 w-fit">
            {fotoUrl && fotoUrl.trim() !== '' ? (
              <img 
                src={fotoUrl} 
                alt={currentUser.nomeCompleto} 
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 flex items-center justify-center font-bold text-2xl border-2 border-blue-200 dark:border-blue-700 shadow-sm">
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

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white break-words">{currentUser.nomeCompleto}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-full">
                {currentUser.cargo || currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>BI: <strong className="text-slate-700 dark:text-slate-200">{currentUser.numeroBI}</strong></span>
              <span>•</span>
              <span className="truncate max-w-xs sm:max-w-md">{escola?.nomeOficial || 'Ministério da Educação / Administração Geral'}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                <span>Ficha Integrada nos Recursos Humanos</span>
              </span>
            </div>
          </div>
        </div>

        <div className="text-left md:text-right bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Instituição Ativa</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate max-w-xs">{escola?.nomeOficial || 'Administração Geral'}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Ano Lectivo: <strong className="text-slate-700 dark:text-slate-200">{escola?.anoLectivoActivo || '—'}</strong></span>
        </div>
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* Aparência e Tema da Interface */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              {resolvedTheme === 'dark' ? <Moon className="w-4 h-4 text-sky-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Aparência &amp; Tema da Interface</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Escolha entre Tema Claro, Tema Escuro ou automático do dispositivo. As pautas e documentos A4 impressos preservam o papel branco oficial.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 w-fit shrink-0">
            Ativo: {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { id: 'light' as ThemeMode, label: 'Tema Claro', desc: 'Fundo luminoso tradicional para ambientes claros', icon: Sun, iconColor: 'text-amber-500' },
            { id: 'dark' as ThemeMode, label: 'Tema Escuro', desc: 'Alto conforto visual em ambientes escuros', icon: Moon, iconColor: 'text-sky-400' },
            { id: 'system' as ThemeMode, label: 'Sistema', desc: 'Segue automaticamente o tema do sistema operativo', icon: Monitor, iconColor: 'text-indigo-500 dark:text-indigo-400' }
          ]).map((opt) => {
            const Icon = opt.icon;
            const active = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThemeMode(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/40'
                    : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                  <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulário Principal */}
      <form noValidate onSubmit={handleSalvarPerfil} className="space-y-6">
        {/* 1. Dados Pessoais & Identificação Civil */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>1. Identificação Civil &amp; Contactos Pessoais</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Dados civis completos sincronizados automaticamente com a ficha de Recursos Humanos e documentação oficial da instituição.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Género
              </label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value as 'M' | 'F')}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número do BI
              </label>
              <input 
                type="text" 
                value={numeroBI}
                onChange={(e) => setNumeroBI(e.target.value)}
                readOnly={!podeEditarBIeLaboral}
                className={`w-full text-xs font-medium px-3 py-2 border rounded-lg ${
                  podeEditarBIeLaboral
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Emissão do BI
              </label>
              <input 
                type="date" 
                value={dataEmissaoBI}
                onChange={(e) => setDataEmissaoBI(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Validade do BI
              </label>
              <input 
                type="date" 
                value={validadeBI}
                onChange={(e) => setValidadeBI(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Local de Emissão do BI
              </label>
              <input 
                type="text" 
                value={localEmissaoBI}
                onChange={(e) => setLocalEmissaoBI(e.target.value)}
                placeholder="Ex: Luanda / Arquivo de Identificação"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Nascimento
              </label>
              <input 
                type="date" 
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estado Civil
              </label>
              <select
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="União de Facto">União de Facto</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nacionalidade
              </label>
              <input 
                type="text" 
                value={nacionalidade}
                onChange={(e) => setNacionalidade(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Naturalidade
              </label>
              <input 
                type="text" 
                value={naturalidade}
                onChange={(e) => setNaturalidade(e.target.value)}
                placeholder="Município / Comuna de nascimento"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Província de Origem
              </label>
              <input 
                type="text" 
                value={provinciaOrigem}
                onChange={(e) => setProvinciaOrigem(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Pai
              </label>
              <input 
                type="text" 
                value={nomePai}
                onChange={(e) => setNomePai(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome da Mãe
              </label>
              <input 
                type="text" 
                value={nomeMae}
                onChange={(e) => setNomeMae(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Município de Residência
              </label>
              <input 
                type="text" 
                value={municipioResidencia}
                onChange={(e) => setMunicipioResidencia(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Morada / Residência Atual Completa
              </label>
              <input 
                type="text" 
                value={residenciaAtual}
                onChange={(e) => setResidenciaAtual(e.target.value)}
                placeholder="Bairro, Rua, Casa nº"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Correio Electrónico (E-mail)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utilizador@escola.med.gov.ao"
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contacto Telefónico Principal
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+244 923 000 000"
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Telefone Alternativo
              </label>
              <input 
                type="text" 
                value={telefoneAlternativo}
                onChange={(e) => setTelefoneAlternativo(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* 2. Dados Profissionais, Académicos & Fiscais */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>2. Dados Académicos, Laborais &amp; Bancários</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Qualificações, vínculo funcional, número de agente, NIF e coordenadas bancárias do funcionário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Habilitações Literárias / Nível Académico
              </label>
              <select
                value={habilitacoes}
                onChange={(e) => {
                  setHabilitacoes(e.target.value);
                  setGrauAcademico(e.target.value);
                }}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Ensino Básico">Ensino Básico</option>
                <option value="Ensino Médio">Ensino Médio Concluído</option>
                <option value="Bacharelato">Bacharelato</option>
                <option value="Licenciatura">Licenciatura</option>
                <option value="Pós-Graduação">Pós-Graduação</option>
                <option value="Mestrado">Mestrado</option>
                <option value="Doutoramento">Doutoramento</option>
                <option value="Pós-Doutoramento">Pós-Doutoramento</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Grau Académico / Formação
              </label>
              <input 
                type="text" 
                value={grauAcademico}
                onChange={(e) => setGrauAcademico(e.target.value)}
                placeholder="Ex: Licenciatura em Gestão Escolar"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Especialidade / Curso
              </label>
              <input 
                type="text" 
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Ex: Matemática / Biologia"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instituição Académica
              </label>
              <input 
                type="text" 
                value={instituicaoAcademica}
                onChange={(e) => setInstituicaoAcademica(e.target.value)}
                placeholder="Ex: UAN / ISCED Luanda"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ano de Conclusão
              </label>
              <input 
                type="text" 
                value={anoConclusaoFormacao}
                onChange={(e) => setAnoConclusaoFormacao(e.target.value)}
                placeholder="Ex: 2020"
                className="w-full text-xs font-mono px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoria Profissional
              </label>
              <input 
                type="text" 
                value={categoriaProfissional}
                onChange={(e) => setCategoriaProfissional(e.target.value)}
                placeholder="Ex: Prof. do Ensino Primário / Secundário"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número de Agente (MED)
              </label>
              <input 
                type="text" 
                value={numeroAgente}
                onChange={(e) => setNumeroAgente(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                NIF (Número de Identificação Fiscal)
              </label>
              <input 
                type="text" 
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Contrato
              </label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Efetivo">Efetivo</option>
                <option value="Função Pública (MED)">Função Pública (MED)</option>
                <option value="Quadro Definitivo">Quadro Definitivo</option>
                <option value="Contratado a Termo Certo">Contratado a Termo Certo</option>
                <option value="Contratado por Tempo Indeterminado">Contratado por Tempo Indeterminado</option>
                <option value="Estagiário">Estagiário</option>
                <option value="Estagiário Curricular">Estagiário Curricular</option>
                <option value="Estagiário Profissional">Estagiário Profissional</option>
                <option value="Colaborador / Tempo Parcial">Colaborador / Tempo Parcial</option>
                <option value="Prestador de Serviços">Prestador de Serviços</option>
                <option value="Comissão de Serviço">Comissão de Serviço</option>
                <option value="Substituto / Interino">Substituto / Interino</option>
                <option value="Voluntário">Voluntário</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Situação Funcional
              </label>
              <select
                value={situacaoFuncional}
                onChange={(e) => setSituacaoFuncional(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Ativo">Ativo</option>
                <option value="Comissão de Serviço">Comissão de Serviço</option>
                <option value="Licença">Licença</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Admissão
              </label>
              <input 
                type="date" 
                value={dataAdmissao}
                onChange={(e) => setDataAdmissao(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Departamento / Setor
              </label>
              <input 
                type="text" 
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                placeholder="Ex: Direção Geral / Gabinete Pedagógico"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Carga Horária Semanal (horas)
              </label>
              <input 
                type="number" 
                min={0}
                max={60}
                value={cargaHorariaSemanal}
                onChange={(e) => setCargaHorariaSemanal(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nº Segurança Social (INSS)
              </label>
              <input 
                type="text" 
                value={numeroINSS}
                onChange={(e) => setNumeroINSS(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Banco
              </label>
              <input 
                type="text" 
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ex: BAI, BFA, BPC, BIC"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                IBAN (AO06...)
              </label>
              <input 
                type="text" 
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="AO06 0000 0000 0000 0000 0000 0"
                className="w-full text-xs font-mono px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Outras Formações & Campos Extras */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Outras Formações Académicas</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ensino Médio, Licenciatura, Mestrado, Doutoramento ou cursos adicionais.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOutrasFormacoes(prev => [
                    ...prev,
                    { id: `form-${Date.now()}`, nivelFormacao: 'Licenciatura', cursoOuArea: '', instituicaoAcademica: '', anoConclusao: '' }
                  ])
                }
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Formação</span>
              </button>
            </div>

            {outrasFormacoes.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 items-center">
                <select
                  value={item.nivelFormacao}
                  onChange={e => setOutrasFormacoes(prev => prev.map((it, i) => (i === idx ? { ...it, nivelFormacao: e.target.value } : it)))}
                  className="sm:col-span-3 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="Bacharelato">Bacharelato</option>
                  <option value="Licenciatura">Licenciatura</option>
                  <option value="Pós-Graduação">Pós-Graduação</option>
                  <option value="Mestrado">Mestrado</option>
                  <option value="Doutoramento">Doutoramento</option>
                  <option value="Curso Técnico / Especialização">Curso Técnico / Especialização</option>
                  <option value="Outro">Outro</option>
                </select>
                <input
                  type="text"
                  value={item.cursoOuArea}
                  onChange={e => setOutrasFormacoes(prev => prev.map((it, i) => (i === idx ? { ...it, cursoOuArea: e.target.value } : it)))}
                  placeholder="Curso / Área"
                  className="sm:col-span-4 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={item.instituicaoAcademica}
                  onChange={e => setOutrasFormacoes(prev => prev.map((it, i) => (i === idx ? { ...it, instituicaoAcademica: e.target.value } : it)))}
                  placeholder="Instituição Académica"
                  className="sm:col-span-3 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={item.anoConclusao || ''}
                  onChange={e => setOutrasFormacoes(prev => prev.map((it, i) => (i === idx ? { ...it, anoConclusao: e.target.value } : it)))}
                  placeholder="Ano"
                  className="sm:col-span-1 text-xs font-mono p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setOutrasFormacoes(prev => prev.filter((_, i) => i !== idx))}
                  className="sm:col-span-1 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg justify-self-end cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Campos Personalizados Adicionais</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Estes campos também são exportados nos ficheiros Excel da escola.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCamposExtrasFormacao(prev => [...prev, { id: `campo-${Date.now()}`, rotulo: '', valor: '' }])
                }
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Campo</span>
              </button>
            </div>

            {camposExtrasFormacao.map((campo, idx) => (
              <div key={campo.id} className="grid grid-cols-1 sm:grid-cols-11 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 items-center">
                <input
                  type="text"
                  value={campo.rotulo}
                  onChange={e => setCamposExtrasFormacao(prev => prev.map((c, i) => (i === idx ? { ...c, rotulo: e.target.value } : c)))}
                  placeholder="Nome do campo"
                  className="sm:col-span-5 text-xs font-semibold p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={campo.valor}
                  onChange={e => setCamposExtrasFormacao(prev => prev.map((c, i) => (i === idx ? { ...c, valor: e.target.value } : c)))}
                  placeholder="Valor / Informação"
                  className="sm:col-span-5 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setCamposExtrasFormacao(prev => prev.filter((_, i) => i !== idx))}
                  className="sm:col-span-1 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg justify-self-end cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Saúde & Contacto de Emergência */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>3. Dados Clínicos &amp; Contacto de Emergência</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Grupo Sanguíneo
              </label>
              <select
                value={grupoSanguineo}
                onChange={(e) => setGrupoSanguineo(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- Não informado --</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alergias Conhecidas
              </label>
              <input 
                type="text" 
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Ex: Nenhuma / Penicilina"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações / Doenças Crónicas
              </label>
              <input 
                type="text" 
                value={doencasCronicas}
                onChange={(e) => setDoencasCronicas(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Contacto de Emergência
              </label>
              <input 
                type="text" 
                value={contactoEmergenciaNome}
                onChange={(e) => setContactoEmergenciaNome(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Telefone de Emergência
              </label>
              <input 
                type="text" 
                value={contactoEmergenciaTelefone}
                onChange={(e) => setContactoEmergenciaTelefone(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Fotografia de Perfil */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Fotografia de Perfil &amp; Avatar Oficial</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Insira um link direto de imagem ou carregue do seu dispositivo.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              URL da Fotografia ou Carregamento Direto
            </label>
            <div className="flex flex-wrap gap-2">
              <input 
                type="text" 
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                placeholder="https://exemplo.com/minha-foto.jpg ou carregue ficheiro"
                className="flex-1 min-w-[200px] text-xs font-mono px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>{comprimindoFoto ? 'A otimizar...' : 'Carregar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {fotoUrl && (
                <button
                  type="button"
                  onClick={() => setFotoUrl('')}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 px-3 py-2 rounded-lg cursor-pointer"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Segurança e Alteração de Palavra-passe */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Segurança & Alteração de Palavra-passe</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Preencha apenas se desejar alterar as suas credenciais de acesso.</p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center space-x-1 shrink-0 cursor-pointer"
            >
              {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{mostrarSenha ? 'Ocultar' : 'Visualizar'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Palavra-passe Atual
              </label>
              <input 
                type={mostrarSenha ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Insira a atual"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nova Palavra-passe
              </label>
              <input 
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo de 6 dígitos"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Nova Palavra-passe
              </label>
              <input 
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova palavra-passe"
                className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Registo de Retificações de Notas pela Direção Geral / Subdireção */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Avisos & Retificações de Notas pela Direção Geral</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Registo forense oficial de todas as notas alteradas ou adicionadas pela Direção para turmas sob a sua lecionação.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 font-bold rounded-lg border border-purple-200 dark:border-purple-800">
              {dbService.getRegistosAlteracoesNotas(currentUser.id, escola?.id).length} Registo(s)
            </span>
          </div>

          {(() => {
            const logsProf = dbService.getRegistosAlteracoesNotas(currentUser.id, escola?.id);
            if (logsProf.length === 0) {
              return (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Nenhuma retificação de nota registada pela Direção</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Todas as avaliações lançadas permanecem exatamente com os valores atribuídos na pauta.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {logsProf.map((reg) => (
                  <div key={reg.id} className="p-3.5 bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/70 rounded-xl text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-purple-100 dark:border-purple-800/60 pb-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-700 text-white rounded text-[10px] font-black">
                          {reg.tipoNota}
                        </span>
                        <strong className="text-slate-900 dark:text-white">{reg.alunoNome}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">({reg.turmaNome} • {reg.classe} {reg.curso ? `- ${reg.curso}` : ''})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{reg.dataHora}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Disciplina:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{reg.disciplinaNome} ({reg.trimestre}º Trimestre)</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Ajuste de Classificação:</span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-400 line-through mr-1.5">{reg.notaAnterior}</span>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-xs">→ {reg.novaNota}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Autoridade que Homologou:</span>
                        <strong className="text-purple-900 dark:text-purple-200">{reg.alteradoPorNome} ({reg.alteradoPorRole})</strong>
                      </div>
                    </div>

                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-800/60 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>Fundamentação Oficial:</strong> {reg.motivoJustificativa}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Mensagem de feedback próxima ao botão para visualização imediata */}
        {mensagemSucesso && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
        {mensagemErro && (
          <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

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
