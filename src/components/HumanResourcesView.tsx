import React, { useState } from 'react';
import { 
  Briefcase, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Award, 
  Plus, 
  Clock, 
  UserCheck,
  ShieldCheck,
  Search,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Mail,
  Phone,
  GraduationCap,
  Users,
  FileSpreadsheet,
  Printer,
  Download,
  Edit2,
  FileText,
  Upload,
  Camera,
  HeartPulse
} from 'lucide-react';
import { Funcionario, RegistoAssiduidade, Escola, UserRole, Genero } from '../types';
import { dbService } from '../services/storage';
import { securityEngine } from '../services/securityEngine';
import { InsigniaAngola } from '../constants/insignia';
import { downloadHtmlDocument, downloadExcelFile } from '../utils/curriculoAngola';
import * as XLSX from 'xlsx';

interface HumanResourcesViewProps {
  escola: Escola;
  currentUser: Funcionario;
  funcionarios: Funcionario[];
  assiduidade: RegistoAssiduidade[];
  onSalvarFuncionario: (func: Funcionario) => void;
  onSalvarRegistoAssiduidade: (registo: RegistoAssiduidade) => void;
  onAtualizarStatusFuncionario?: (funcionarioId: string, status: 'Ativa' | 'Suspensa') => void;
  onRedefinirSenhaFuncionario?: (funcionarioId: string, novaSenha: string) => void;
  onEliminarFuncionario?: (funcionarioId: string) => void;
}

export const HumanResourcesView: React.FC<HumanResourcesViewProps> = ({
  escola,
  currentUser,
  funcionarios,
  assiduidade,
  onSalvarFuncionario,
  onSalvarRegistoAssiduidade,
  onAtualizarStatusFuncionario,
  onRedefinirSenhaFuncionario,
  onEliminarFuncionario
}) => {
  const [subTab, setSubTab] = useState<'colaboradores' | 'ponto'>('colaboradores');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Novo / Editar Funcionário
  const [showNovoFuncionarioModal, setShowNovoFuncionarioModal] = useState(false);
  const [editingFuncionarioId, setEditingFuncionarioId] = useState<string | null>(null);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [numeroBI, setNumeroBI] = useState('');
  const [genero, setGenero] = useState<Genero>('M');
  const [cargo, setCargo] = useState('');
  const [role, setRole] = useState<UserRole>('Professor');
  const [telefone, setTelefone] = useState('+244 923 000 000');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Educa2026!');
  const [habilitacoes, setHabilitacoes] = useState('Licenciatura em Ciências da Educação (ISCED)');
  const [ehProfessor, setEhProfessor] = useState(true);
  const [ehAdministrativoQueLeciona, setEhAdministrativoQueLeciona] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Detalhes Civis, Laborais e Financeiros completos (MED Angola)
  const [dataNascimento, setDataNascimento] = useState('1985-04-12');
  const [naturalidade, setNaturalidade] = useState('Luanda');
  const [provincia, setProvincia] = useState('Luanda');
  const [municipio, setMunicipio] = useState('Luanda');
  const [nacionalidade, setNacionalidade] = useState('Angolana');
  const [estadoCivil, setEstadoCivil] = useState('Casado(a)');
  const [endereco, setEndereco] = useState('Bairro Central, Luanda');
  const [dataEmissaoBI, setDataEmissaoBI] = useState('2020-01-10');
  const [localEmissaoBI, setLocalEmissaoBI] = useState('Luanda');
  const [dataValidadeBI, setDataValidadeBI] = useState('2030-01-10');
  const [telefoneAlternativo, setTelefoneAlternativo] = useState('');
  const [grauAcademico, setGrauAcademico] = useState<'Médio' | 'Bacharel' | 'Licenciado' | 'Mestre' | 'Doutor'>('Licenciado');
  const [especialidade, setEspecialidade] = useState('Ensino da Língua Portuguesa');
  const [categoriaProfissional, setCategoriaProfissional] = useState('Professor do IIº Ciclo do Ensino Secundário - 6º Grau');
  const [numeroMecanografico, setNumeroMecanografico] = useState('AG-89412');
  const [situacaoFuncional, setSituacaoFuncional] = useState('Ativo');
  const [tipoContrato, setTipoContrato] = useState('Efetivo');
  const [cargaHorariaSemanal, setCargaHorariaSemanal] = useState(24);
  const [dataAdmissao, setDataAdmissao] = useState('2020-02-01');
  const [banco, setBanco] = useState('BFA - Banco de Fomento Angola');
  const [iban, setIban] = useState('AO06.0006.0000.1234.5678.9012.3');
  const [numeroSegurancaSocial, setNumeroSegurancaSocial] = useState('INSS-481920');
  const [nomePai, setNomePai] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [nif, setNif] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [grupoSanguineo, setGrupoSanguineo] = useState('O+');
  const [alergias, setAlergias] = useState('');
  const [doencasCronicas, setDoencasCronicas] = useState('');
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState('');
  const [contactoEmergenciaNome, setContactoEmergenciaNome] = useState('');
  const [contactoEmergenciaTelefone, setContactoEmergenciaTelefone] = useState('');
  const [atestadoMedicoData, setAtestadoMedicoData] = useState('');

  const configSistema = dbService.getConfiguracaoSistema();

  // Modal Ficha Individual Completa
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [funcParaFicha, setFuncParaFicha] = useState<Funcionario | null>(null);

  // Modal Senha
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false);
  const [funcSelecionado, setFuncSelecionado] = useState<Funcionario | null>(null);
  const [novaSenhaInput, setNovaSenhaInput] = useState('');

  // Notificações
  const [feedback, setFeedback] = useState<string | null>(null);
  const emitirFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Permissão da Direção
  const ehDiretor = currentUser.role === 'DiretorGeral' || currentUser.role === 'AdminGeral';
  const temPermissaoAssiduidade = ['DiretorGeral', 'SubdiretorPedagogico', 'AdminGeral'].includes(currentUser.role);

  // Apenas funcionários desta escola (ou todos se AdminGeral)
  const funcionariosDaEscola = funcionarios.filter(f => 
    (currentUser.role === 'AdminGeral' || f.escolaId === escola.id) &&
    f.role !== 'AdminGeral'
  );

  const filteredFuncionarios = funcionariosDaEscola.filter(f => 
    f.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.numeroBI || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.numeroAgente || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estatísticas por funcionário
  const statsPorFuncionario = funcionariosDaEscola.map(func => {
    const registos = assiduidade.filter(a => a.funcionarioId === func.id);
    const presentes = registos.filter(a => a.estado === 'Presente').length;
    const faltasInjustificadas = registos.filter(a => a.estado === 'Falta_Injustificada').length;
    const faltasJustificadas = registos.filter(a => a.estado === 'Falta_Justificada').length;
    const totalDias = registos.length;
    const taxaPresenca = totalDias > 0 ? Math.round((presentes / totalDias) * 100) : 100;

    return {
      funcionario: func,
      presentes,
      faltasInjustificadas,
      faltasJustificadas,
      taxaPresenca,
      totalDias
    };
  });

  const comMaisFaltas = [...statsPorFuncionario].sort((a, b) => b.faltasInjustificadas - a.faltasInjustificadas);
  const maisAssiduos = [...statsPorFuncionario].sort((a, b) => b.taxaPresenca - a.taxaPresenca);

  const handleMarcarPresenca = (funcId: string, presente: boolean, justificada = false, motivo = '') => {
    if (!temPermissaoAssiduidade) {
      alert('Apenas o Diretor Geral e a Subdiretora Pedagógica têm autorização para assinar o livro de ponto.');
      return;
    }

    const func = funcionarios.find(f => f.id === funcId);
    const estado = presente ? 'Presente' : (justificada ? 'Falta_Justificada' : 'Falta_Injustificada');

    const registo: RegistoAssiduidade = {
      id: `assid-${funcId}-${dataSelecionada}`,
      funcionarioId: funcId,
      funcionarioNome: func?.nomeCompleto || '',
      cargo: func?.cargo || '',
      escolaId: escola.id,
      data: dataSelecionada,
      estado,
      observacao: motivo,
      justificativa: motivo,
      registadoPor: currentUser.nomeCompleto
    };

    onSalvarRegistoAssiduidade(registo);
  };

  const gerarSenhaForte = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = 'Educa';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setPassword(pass);
    setNovaSenhaInput(pass);
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem selecionada é muito pesada (máximo 5MB). Por favor selecione uma imagem menor.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const abrirModalNovoFuncionario = () => {
    setEditingFuncionarioId(null);
    setNomeCompleto('');
    setNumeroBI('00' + Math.floor(10000000 + Math.random() * 90000000) + 'LA042');
    setDataEmissaoBI('2020-01-10');
    setDataValidadeBI('2030-01-10');
    setLocalEmissaoBI('Arquivo de Identificação de Luanda');
    setDataNascimento('1988-05-15');
    setNaturalidade('Luanda');
    setProvincia('Luanda');
    setMunicipio('Luanda');
    setNacionalidade('Angolana');
    setEstadoCivil('Casado(a)');
    setNomePai('');
    setNomeMae('');
    setEndereco('Bairro Central, Luanda');
    setTelefone('+244 923 ' + Math.floor(100000 + Math.random() * 900000));
    setTelefoneAlternativo('');
    setEmail(`funcionario.${Math.floor(100 + Math.random() * 900)}@${escola.sigla?.toLowerCase() || 'escola'}.med.gov.ao`);
    setGenero('M');
    setCargo('Professor do IIº Ciclo');
    setRole('Professor');
    setGrauAcademico('Licenciado');
    setEspecialidade('Ensino da Língua Portuguesa');
    setHabilitacoes('Licenciatura em Ciências da Educação (ISCED)');
    setCategoriaProfissional('Professor do IIº Ciclo do Ensino Secundário - 6º Grau');
    setNumeroMecanografico('AG-' + Math.floor(10000 + Math.random() * 90000));
    setTipoContrato('Efetivo');
    setSituacaoFuncional('Ativo');
    setCargaHorariaSemanal(24);
    setDataAdmissao(new Date().toISOString().split('T')[0]);
    setBanco('BFA - Banco de Fomento Angola');
    setIban('AO06.0006.0000.' + Math.floor(1000 + Math.random() * 9000) + '.5678.9012.3');
    setNumeroSegurancaSocial('INSS-' + Math.floor(100000 + Math.random() * 900000));
    setNif('00' + Math.floor(10000000 + Math.random() * 90000000) + 'LA042');
    setPassword('Educa2026!');
    setEhProfessor(true);
    setEhAdministrativoQueLeciona(false);
    setFotoUrl('');
    setGrupoSanguineo('O+');
    setAlergias('');
    setDoencasCronicas('');
    setNecessidadesEspeciais('');
    setContactoEmergenciaNome('');
    setContactoEmergenciaTelefone('');
    setAtestadoMedicoData('');
    setShowNovoFuncionarioModal(true);
  };

  const abrirModalEditarFuncionario = (func: Funcionario) => {
    setEditingFuncionarioId(func.id);
    setNomeCompleto(func.nomeCompleto || '');
    setNumeroBI(func.numeroBI || func.bi || '');
    setDataEmissaoBI(func.dataEmissaoBI || '2020-01-10');
    setDataValidadeBI(func.dataValidadeBI || '2030-01-10');
    setLocalEmissaoBI(func.localEmissaoBI || func.arquivoIdentificacao || 'Arquivo de Identificação de Luanda');
    setDataNascimento(func.dataNascimento || '1985-04-12');
    setNaturalidade(func.naturalidadeMunicipio || func.provincia || 'Luanda');
    setProvincia(func.provincia || func.naturalidadeProvincia || 'Luanda');
    setMunicipio(func.municipio || func.naturalidadeMunicipio || 'Luanda');
    setNacionalidade(func.nacionalidade || 'Angolana');
    setEstadoCivil(func.estadoCivil || 'Casado(a)');
    setNomePai(func.nomePai || '');
    setNomeMae(func.nomeMae || '');
    setEndereco(func.residencia || func.bairro || 'Bairro Central, Luanda');
    setTelefone(func.telefone || '');
    setTelefoneAlternativo(func.telefoneAlternativo || '');
    setEmail(func.email || '');
    setGenero(func.genero || 'M');
    setCargo(func.cargo || 'Professor');
    setRole(func.role || 'Professor');
    setGrauAcademico((func.grauAcademico as any) || 'Licenciado');
    setEspecialidade(func.especialidade || func.habilitacoes || 'Ensino');
    setHabilitacoes(func.habilitacoes || '');
    setCategoriaProfissional(func.categoriaProfissional || 'Professor do IIº Ciclo do Ensino Secundário - 6º Grau');
    setNumeroMecanografico(func.numeroAgente || 'AG-89412');
    setTipoContrato(func.tipoContrato === 'Contratado' ? 'Contratado' : func.tipoContrato === 'Colaborador' ? 'Colaborador' : 'Efetivo');
    setSituacaoFuncional(func.situacaoFuncional || 'Ativo');
    setCargaHorariaSemanal(func.cargaHorariaSemanal || 24);
    setDataAdmissao(func.dataAdmissao || '2020-02-01');
    setBanco(func.banco || 'BFA - Banco de Fomento Angola');
    setIban(func.iban || 'AO06.0006.0000.1234.5678.9012.3');
    setNumeroSegurancaSocial(func.numeroSegurancaSocial || 'INSS-481920');
    setNif(func.nif || func.numeroBI || '');
    setPassword(func.password || 'Educa2026!');
    setEhProfessor(func.ehProfessor ?? true);
    setEhAdministrativoQueLeciona(func.ehAdministrativoQueLeciona ?? false);
    setFotoUrl(func.fotoUrl || '');
    setGrupoSanguineo(func.grupoSanguineo || 'O+');
    setAlergias(func.alergias || '');
    setDoencasCronicas(func.doencasCronicas || '');
    setNecessidadesEspeciais(func.necessidadesEspeciais || '');
    setContactoEmergenciaNome(func.contactoEmergenciaNome || '');
    setContactoEmergenciaTelefone(func.contactoEmergenciaTelefone || '');
    setAtestadoMedicoData(func.atestadoMedicoData || '');
    setShowNovoFuncionarioModal(true);
  };

  const handleCreateFuncionario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCompleto.trim() || !cargo.trim() || !email.trim()) return;

    const funcExistente = editingFuncionarioId ? funcionarios.find(f => f.id === editingFuncionarioId) : null;

    const funcionarioAtualizado: Funcionario = {
      ...(funcExistente || {}),
      id: editingFuncionarioId || `func-${Date.now()}`,
      escolaId: escola.id,
      nomeCompleto: nomeCompleto.trim(),
      genero,
      numeroBI: (numeroBI || funcExistente?.numeroBI || `00${Math.floor(10000000 + Math.random() * 90000000)}LA045`).trim(),
      dataEmissaoBI,
      dataValidadeBI,
      localEmissaoBI,
      arquivoIdentificacao: localEmissaoBI,
      dataNascimento,
      naturalidadeProvincia: provincia,
      naturalidadeMunicipio: municipio,
      nacionalidade,
      estadoCivil,
      nomePai: nomePai.trim(),
      nomeMae: nomeMae.trim(),
      residencia: endereco.trim(),
      bairro: endereco.trim(),
      municipio,
      provincia,
      numeroAgente: numeroMecanografico.trim(),
      nif: (nif || numeroBI).trim(),
      categoriaProfissional,
      grauAcademico,
      especialidade: especialidade.trim(),
      tipoContrato: tipoContrato as any,
      situacaoFuncional,
      cargaHorariaSemanal: Number(cargaHorariaSemanal) || 24,
      banco,
      iban: iban.trim(),
      numeroSegurancaSocial: numeroSegurancaSocial.trim(),
      telefone: telefone.trim(),
      telefoneAlternativo: telefoneAlternativo.trim(),
      email: email.trim().toLowerCase(),
      cargo: cargo.trim(),
      role,
      ehProfessor,
      ehAdministrativoQueLeciona,
      habilitacoes: (habilitacoes || especialidade).trim(),
      fotoUrl: fotoUrl.trim() || funcExistente?.fotoUrl || (genero === 'F' 
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
      grupoSanguineo,
      alergias: alergias.trim(),
      doencasCronicas: doencasCronicas.trim(),
      necessidadesEspeciais: necessidadesEspeciais.trim(),
      contactoEmergenciaNome: contactoEmergenciaNome.trim(),
      contactoEmergenciaTelefone: contactoEmergenciaTelefone.trim(),
      atestadoMedicoData,
      dataAdmissao,
      ativo: true,
      password: password || funcExistente?.password || 'Educa2026!',
      statusConta: funcExistente?.statusConta || 'Ativa',
      criadoPorRole: funcExistente?.criadoPorRole || currentUser.role,
      criadoPorNome: funcExistente?.criadoPorNome || currentUser.nomeCompleto,
      dataCriacao: funcExistente?.dataCriacao || new Date().toLocaleDateString('pt-PT')
    };

    onSalvarFuncionario(funcionarioAtualizado);
    setShowNovoFuncionarioModal(false);
    emitirFeedback(
      editingFuncionarioId 
        ? `Dados completos de ${funcionarioAtualizado.nomeCompleto} atualizados com sucesso!`
        : `Funcionário ${funcionarioAtualizado.nomeCompleto} cadastrado com sucesso com todos os detalhes!`
    );
  };

  // Exportar TODOS os funcionários com todos os dados completos em Excel
  const handleExportarTodosFuncionariosExcel = () => {
    const dados = funcionarios.map((func, idx) => ({
      'Nº Ordem': idx + 1,
      'Nome Completo': func.nomeCompleto,
      'Género': func.genero === 'M' ? 'Masculino' : 'Feminino',
      'Nº BI': func.numeroBI || (func as any).bi || '',
      'Data Emissão BI': func.dataEmissaoBI || '',
      'Data Validade BI': func.dataValidadeBI || '',
      'Local Emissão': func.localEmissaoBI || func.arquivoIdentificacao || '',
      'Data de Nascimento': func.dataNascimento || '',
      'Naturalidade': func.naturalidadeMunicipio || func.provincia || '',
      'Província': func.provincia || func.naturalidadeProvincia || '',
      'Município': func.municipio || func.naturalidadeMunicipio || '',
      'Nacionalidade': func.nacionalidade || 'Angolana',
      'Estado Civil': func.estadoCivil || '',
      'Filiação (Pai)': func.nomePai || '',
      'Filiação (Mãe)': func.nomeMae || '',
      'Residência / Bairro': func.residencia || func.bairro || '',
      'Telefone Principal': func.telefone,
      'Telefone Alternativo': func.telefoneAlternativo || '',
      'Email Institucional': func.email,
      'Cargo / Função': func.cargo,
      'Perfil de Acesso (Role)': func.role,
      'Categoria Profissional MED': func.categoriaProfissional || '',
      'Nº Mecanográfico / Agente': func.numeroAgente || (func as any).numeroMecanografico || '',
      'Grau Académico': func.grauAcademico || '',
      'Especialidade / Curso': func.especialidade || func.habilitacoes || '',
      'Tipo de Contrato': func.tipoContrato || 'Efetivo',
      'Situação Funcional': func.situacaoFuncional || 'Ativo',
      'Data de Admissão': func.dataAdmissao || '',
      'Carga Horária Semanal': `${func.cargaHorariaSemanal || 24} h/sem`,
      'Instituição Bancária': func.banco || '',
      'IBAN': func.iban || '',
      'NIF': func.nif || func.numeroBI || '',
      'Nº de Segurança Social (INSS)': func.numeroSegurancaSocial || '',
      'Grupo Sanguíneo': func.grupoSanguineo || '—',
      'Alergias': func.alergias || 'Nenhuma',
      'Doenças Crónicas': func.doencasCronicas || 'Nenhuma',
      'Necessidades Especiais': func.necessidadesEspeciais || 'Nenhuma',
      'Contacto Emergência (Nome)': func.contactoEmergenciaNome || '',
      'Contacto Emergência (Telefone)': func.contactoEmergenciaTelefone || '',
      'Data do Atestado Médico': func.atestadoMedicoData || '',
      'Estado da Conta': func.statusConta || (func.ativo ? 'Ativa' : 'Inativa')
    }));

    downloadExcelFile(
      'Funcionarios_Quadro_Completo', 
      dados, 
      `Quadro_Pessoal_Completo_${escola.sigla || 'MED'}.xlsx`
    );
    emitirFeedback('Ficheiro Excel com todos os dados completos dos funcionários gerado com êxito!');
  };

  const handleExportarFichaExcel = (func: Funcionario) => {
    const dados = [{
      'Nome Completo': func.nomeCompleto,
      'Gênero': func.genero === 'M' ? 'Masculino' : 'Feminino',
      'Bilhete de Identidade': func.numeroBI,
      'Emissão BI': func.dataEmissaoBI || '—',
      'Validade BI': func.dataValidadeBI || '—',
      'Local Emissão': func.localEmissaoBI || '—',
      'Data de Nascimento': func.dataNascimento || '—',
      'Estado Civil': func.estadoCivil || '—',
      'Nacionalidade': func.nacionalidade || 'Angolana',
      'Naturalidade': func.naturalidadeMunicipio || func.naturalidadeProvincia || '—',
      'Nome do Pai': func.nomePai || '—',
      'Nome da Mãe': func.nomeMae || '—',
      'Morada / Residência': func.residencia || '—',
      'Telefone Principal': func.telefone,
      'Telefone Alternativo': func.telefoneAlternativo || '—',
      'E-mail': func.email,
      'Cargo / Função': func.cargo,
      'Perfil Role': func.role,
      'Grau Académico': func.grauAcademico || '—',
      'Especialidade': func.especialidade || func.habilitacoes || '—',
      'Categoria Profissional': func.categoriaProfissional || '—',
      'Nº Mecanográfico / Agente': func.numeroAgente || '—',
      'Tipo de Contrato': func.tipoContrato || '—',
      'Situação Funcional': func.situacaoFuncional || '—',
      'Data de Admissão': func.dataAdmissao || '—',
      'Carga Horária Semanal': `${func.cargaHorariaSemanal || 24} h/sem`,
      'Banco': func.banco || '—',
      'IBAN': func.iban || '—',
      'NIF': func.nif || func.numeroBI,
      'Nº de Segurança Social (INSS)': func.numeroSegurancaSocial || '—'
    }];
    downloadExcelFile('Ficha_Funcionario', dados, `Ficha_${func.nomeCompleto.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportarFichaHTML = (func: Funcionario) => {
    const el = document.getElementById('ficha-funcionario-dossier');
    if (!el) {
      window.print();
      return;
    }
    downloadHtmlDocument(
      `Ficha_Funcionario_${func.nomeCompleto.replace(/\s+/g, '_')}`,
      `Ficha Individual - ${func.nomeCompleto}`,
      el.outerHTML
    );
  };

  const handleToggleStatus = (func: Funcionario) => {
    if (!onAtualizarStatusFuncionario) return;
    const novoStatus = func.statusConta === 'Suspensa' ? 'Ativa' : 'Suspensa';
    onAtualizarStatusFuncionario(func.id, novoStatus);
    emitirFeedback(`A conta de ${func.nomeCompleto} foi ${novoStatus === 'Ativa' ? 'reativada' : 'suspensa'}.`);
  };

  const abrirModalSenha = (func: Funcionario) => {
    setFuncSelecionado(func);
    setNovaSenhaInput(func.password || 'Educa2026!');
    setModalSenhaOpen(true);
  };

  const salvarNovaSenha = async () => {
    if (!funcSelecionado || !novaSenhaInput.trim()) return;
    try {
      if (dbService.alterarSenhaPorOperador) {
        await dbService.alterarSenhaPorOperador(funcSelecionado.id, novaSenhaInput.trim(), currentUser);
      } else if (onRedefinirSenhaFuncionario) {
        onRedefinirSenhaFuncionario(funcSelecionado.id, novaSenhaInput.trim());
      }
      // Garante o desbloqueio no securityEngine
      securityEngine.resetarBloqueioCredenciais(funcSelecionado.email || funcSelecionado.id, currentUser.nomeCompleto);
      setModalSenhaOpen(false);
      emitirFeedback(`Credenciais de ${funcSelecionado.nomeCompleto} atualizadas com cifragem AES-256 e acesso desbloqueado!`);
    } catch (err: any) {
      alert(err?.message || 'Falha ao redefinir a palavra-passe do funcionário.');
    }
  };

  const handleEliminar = (func: Funcionario) => {
    if (!onEliminarFuncionario) return;
    if (confirm(`Tem certeza que deseja remover ${func.nomeCompleto} da escola? O acesso deste funcionário será revogado.`)) {
      onEliminarFuncionario(func.id);
      emitirFeedback(`Funcionário ${func.nomeCompleto} removido com sucesso.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Alerta de Feedback */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header com Contexto Institucional */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Gestão da Direção Escolar • {escola.nomeOficial}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Gestão de Funcionários, Credenciais & Assiduidade
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Como Diretor Geral, cabe-lhe cadastrar o pessoal docente e administrativo, atribuir perfis com permissões específicas, 
            gerar as respetivas credenciais de acesso ao sistema e supervisionar o livro de ponto.
          </p>
        </div>

        {ehDiretor && (
          <button
            type="button"
            onClick={abrirModalNovoFuncionario}
            className="px-4 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center space-x-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Registar Funcionário & Credenciais</span>
          </button>
        )}
      </div>

      {/* Navegação de Sub-Abas */}
      <div className="flex border-b border-gray-200 space-x-2 bg-gray-50/70 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab('colaboradores')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-2 ${
            subTab === 'colaboradores' 
              ? 'bg-white text-blue-700 shadow-xs' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Funcionários & Credenciais de Acesso ({funcionariosDaEscola.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('ponto')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-2 ${
            subTab === 'ponto' 
              ? 'bg-white text-blue-700 shadow-xs' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Livro de Ponto & Assiduidade Diária</span>
        </button>
      </div>

      {/* ABA 1: Gestão de Funcionários & Credenciais */}
      {subTab === 'colaboradores' && (
        <div className="space-y-4">
          {/* Métricas e Barra de Pesquisa */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-gray-500 font-semibold block">Total de Colaboradores</span>
              <span className="text-xl font-black text-gray-900">{funcionariosDaEscola.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-blue-600 font-semibold block">Professores</span>
              <span className="text-xl font-black text-blue-700">
                {funcionariosDaEscola.filter(f => f.role === 'Professor' || f.ehProfessor).length}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-emerald-600 font-semibold block">Contas Ativas</span>
              <span className="text-xl font-black text-emerald-700">
                {funcionariosDaEscola.filter(f => f.statusConta !== 'Suspensa').length}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-amber-600 font-semibold block">Equipa de Gestão</span>
              <span className="text-xl font-black text-amber-700">
                {funcionariosDaEscola.filter(f => ['DiretorGeral', 'SubdiretorPedagogico', 'Secretaria'].includes(f.role)).length}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar funcionário por nome, cargo ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportarTodosFuncionariosExcel}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer shrink-0"
              title="Baixar lista completa de todos os funcionários com todos os dados e campos em Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar Todos Funcionários (Excel)</span>
            </button>
          </div>

          {/* Tabela de Colaboradores com Credenciais */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Cargo / Função</th>
                    <th className="p-3">Perfil & Permissões</th>
                    <th className="p-3">Login / Email de Acesso</th>
                    <th className="p-3">Estado da Conta</th>
                    <th className="p-3 text-right">Credenciais & Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFuncionarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                        Nenhum funcionário encontrado nos registos da instituição.
                      </td>
                    </tr>
                  ) : (
                    filteredFuncionarios.map((func) => {
                      const isSuspensa = func.statusConta === 'Suspensa' || func.ativo === false;

                      const getRoleBadge = (r: UserRole) => {
                        switch(r) {
                          case 'DiretorGeral':
                            return <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800">Direção Geral</span>;
                          case 'SubdiretorPedagogico':
                            return <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-indigo-100 text-indigo-800">Subdiretoria Pedagógica</span>;
                          case 'Professor':
                            return <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">Docente</span>;
                          case 'Secretaria':
                            return <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">Secretaria Escolar</span>;
                          default:
                            return <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-gray-100 text-gray-800">{r}</span>;
                        }
                      };

                      return (
                        <tr key={`${func.id}-${func.escolaId || ''}-${func.numeroBI || ''}`} className="hover:bg-gray-50/80">
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={func.fotoUrl} 
                                alt={func.nomeCompleto} 
                                className="h-8 w-8 rounded-full object-cover border border-gray-200 shrink-0" 
                              />
                              <div>
                                <h4 className="font-bold text-gray-900">{func.nomeCompleto}</h4>
                                <span className="text-[10px] text-gray-500">BI: {func.numeroBI}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-medium text-gray-800 block">{func.cargo}</span>
                            <span className="text-[10px] text-gray-500 block truncate max-w-xs">{func.habilitacoes}</span>
                          </td>

                          <td className="p-3">
                            {getRoleBadge(func.role)}
                          </td>

                          <td className="p-3">
                            <span className="font-mono text-blue-700 font-semibold block">{func.email}</span>
                            <span className="text-[10px] text-gray-400 block">{func.telefone}</span>
                          </td>

                          <td className="p-3">
                            {isSuspensa ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                <Lock className="h-3 w-3 mr-0.5" />
                                <span>Suspensa</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle className="h-3 w-3 mr-0.5" />
                                <span>Ativa</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFuncParaFicha(func);
                                  setShowFichaModal(true);
                                }}
                                className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Visualizar e Imprimir Ficha Individual do Funcionário"
                              >
                                <FileText className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => abrirModalEditarFuncionario(func)}
                                className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar Todos os Detalhes Cadastrais"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {ehDiretor && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => abrirModalSenha(func)}
                                    className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Ver ou Redefinir Senha do Funcionário"
                                  >
                                    <Key className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(func)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isSuspensa 
                                        ? 'text-emerald-700 hover:bg-emerald-50' 
                                        : 'text-amber-700 hover:bg-amber-50'
                                    }`}
                                    title={isSuspensa ? 'Reativar Conta' : 'Suspender Acesso'}
                                  >
                                    {isSuspensa ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEliminar(func)}
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Remover Funcionário da Escola"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: Livro de Ponto & Assiduidade */}
      {subTab === 'ponto' && (
        <div className="space-y-6">
          {/* Alerta de Autorização MED */}
          {!temPermissaoAssiduidade ? (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-center space-x-3 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-amber-900 font-medium">
                <strong>Modo de Leitura:</strong> O registo de faltas e presenças no livro de ponto é exclusivo do Diretor Geral e da Subdiretora Pedagógica.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-green-50 border-2 border-green-600 rounded-xl flex items-center space-x-3 text-xs">
              <ShieldCheck className="h-5 w-5 text-green-700 shrink-0" />
              <p className="text-green-900 font-medium">
                <strong>Autorização Pedagógica Ativa:</strong> Você tem poderes para lançar e justificar faltas diárias do corpo docente e administrativo da instituição.
              </p>
            </div>
          )}

          {/* Destaques do Verde ao Vermelho */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-green-600 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Docentes Mais Assíduos (Quadro de Mérito)</h3>
                </div>
                <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                  Elogio Oficial
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {maisAssiduos.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-green-50/50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={item.funcionario.fotoUrl} 
                        alt={item.funcionario.nomeCompleto} 
                        className="h-9 w-9 rounded-full object-cover border border-green-300" 
                      />
                      <div>
                        <h4 className="font-bold text-gray-900">{item.funcionario.nomeCompleto}</h4>
                        <span className="text-[10px] text-gray-500">{item.funcionario.cargo}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-green-700">{item.taxaPresenca}% Assiduidade</span>
                      <div className="text-[10px] text-gray-500">{item.presentes} presenças</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border-2 border-red-500 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Atenção Pedagógica: Faltas Acumuladas</h3>
                </div>
                <span className="text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                  Alerta Crítico
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {comMaisFaltas.slice(0, 3).map((item, idx) => {
                  const corFalta = item.faltasInjustificadas > 0 ? 'text-red-700' : 'text-green-700';
                  return (
                    <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={item.funcionario.fotoUrl} 
                          alt={item.funcionario.nomeCompleto} 
                          className="h-9 w-9 rounded-full object-cover border" 
                        />
                        <div>
                          <h4 className="font-bold text-gray-900">{item.funcionario.nomeCompleto}</h4>
                          <span className="text-[10px] text-gray-500">{item.funcionario.cargo}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-black ${corFalta}`}>{item.faltasInjustificadas} falta(s)</span>
                        <div className="text-[10px] text-gray-500">{item.faltasJustificadas} justificadas</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Livro de Ponto Diário Interativo */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Livro de Ponto Diário</h3>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-gray-700">Data:</label>
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Funcionário</th>
                    <th className="p-3">Cargo / Função</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3">Estado em {dataSelecionada}</th>
                    <th className="p-3 text-right">Ação do Ponto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFuncionarios.map((func) => {
                    const regHoje = assiduidade.find(a => a.funcionarioId === func.id && a.data === dataSelecionada);
                    const presente = regHoje ? regHoje.estado === 'Presente' : true;

                    return (
                      <tr key={`${func.id}-${func.escolaId || ''}-${func.numeroBI || ''}`} className="hover:bg-gray-50/70">
                        <td className="p-3 font-bold text-gray-900 flex items-center space-x-2.5">
                          <img src={func.fotoUrl} alt={func.nomeCompleto} className="h-7 w-7 rounded-full object-cover border" />
                          <span>{func.nomeCompleto}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-800">{func.cargo}</span>
                          {func.ehAdministrativoQueLeciona && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              Leciona
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-gray-600">{func.telefone}</td>
                        <td className="p-3">
                          {presente ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-300 inline-flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                              Presente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 inline-flex items-center">
                              <XCircle className="h-3 w-3 mr-1 text-red-600" />
                              Ausente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {temPermissaoAssiduidade ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMarcarPresenca(func.id, true)}
                                className="px-2.5 py-1 text-[11px] font-bold text-green-800 bg-green-50 border border-green-600 rounded hover:bg-green-100 cursor-pointer"
                              >
                                Presente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarcarPresenca(func.id, false, false, 'Falta injustificada')}
                                className="px-2.5 py-1 text-[11px] font-bold text-red-800 bg-red-50 border border-red-600 rounded hover:bg-red-100 cursor-pointer"
                              >
                                Marcar Falta
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400 text-[11px]">Leitura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Registar / Editar Funcionário com TODOS os Detalhes Civis, Laborais e Financeiros */}
      {showNovoFuncionarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {editingFuncionarioId ? 'Atualizar Dossier do Colaborador' : 'Cadastro Integral de Funcionário & Docente'}
                  </h3>
                  <p className="text-xs text-blue-700 font-semibold">{escola.nomeOficial} • Ministério da Educação</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowNovoFuncionarioModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFuncionario} className="space-y-5 text-xs">
              {/* FOTOGRAFIA OFICIAL TIPO PASSE */}
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                <label className="font-bold text-gray-800 block mb-2">Fotografia Oficial do Funcionário (Tipo Passe)</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {fotoUrl ? (
                    <div className="relative group">
                      <img 
                        src={fotoUrl} 
                        alt="Foto do Funcionário" 
                        className="h-24 w-24 rounded-xl object-cover border-2 border-blue-600 shadow-sm" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setFotoUrl('')} 
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                        title="Remover fotografia"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-gray-200 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-500">
                      <Camera className="h-8 w-8 text-gray-400 mb-1" />
                      <span className="text-[10px] font-semibold">Sem Foto</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <label className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs transition-colors">
                        <Upload className="h-4 w-4" />
                        <span>Carregar Foto do Computador / Telefone</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFotoUpload} 
                          className="hidden" 
                        />
                      </label>

                      {fotoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setFotoUrl('')} 
                          className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      A fotografia tipo passe será impressa na Ficha Oficial de Funcionário, no Cartão de Identificação Escolar e nos Registos do MED Angola.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. IDENTIFICAÇÃO CIVIL & DADOS PESSOAIS */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-black text-blue-950 uppercase text-[11px] tracking-wide border-b pb-1.5 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  <span>1. Identificação Civil & Pessoal</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-700 block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      placeholder="Ex: Manuel António da Costa"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Gênero *</label>
                    <select
                      value={genero}
                      onChange={(e) => setGenero(e.target.value as Genero)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">N.º do Bilhete de Identidade (BI) *</label>
                    <input
                      type="text"
                      required
                      value={numeroBI}
                      onChange={(e) => setNumeroBI(e.target.value)}
                      placeholder="001928374LA045"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Data de Emissão do BI</label>
                    <input
                      type="date"
                      value={dataEmissaoBI}
                      onChange={(e) => setDataEmissaoBI(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Data de Validade do BI</label>
                    <input
                      type="date"
                      value={dataValidadeBI}
                      onChange={(e) => setDataValidadeBI(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-gray-700 block mb-1">Local / Arquivo de Emissão do BI</label>
                    <input
                      type="text"
                      value={localEmissaoBI}
                      onChange={(e) => setLocalEmissaoBI(e.target.value)}
                      placeholder="Ex: Arquivo de Identificação de Luanda"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Estado Civil</label>
                    <select
                      value={estadoCivil}
                      onChange={(e) => setEstadoCivil(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nacionalidade</label>
                    <input
                      type="text"
                      value={nacionalidade}
                      onChange={(e) => setNacionalidade(e.target.value)}
                      placeholder="Angolana"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Naturalidade (Município)</label>
                    <input
                      type="text"
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      placeholder="Ex: Luanda, Cazenga, Mbanza Kongo"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Província de Origem</label>
                    <input
                      type="text"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      placeholder="Ex: Luanda, Zaire, Benguela"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nome do Pai</label>
                    <input
                      type="text"
                      value={nomePai}
                      onChange={(e) => setNomePai(e.target.value)}
                      placeholder="Ex: António da Costa"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nome da Mãe</label>
                    <input
                      type="text"
                      value={nomeMae}
                      onChange={(e) => setNomeMae(e.target.value)}
                      placeholder="Ex: Maria Teresa Ndilu"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="font-bold text-gray-700 block mb-1">Residência Atual / Bairro / Endereço</label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Ex: Bairro Central, Rua das Acácias, Casa nº 12, Luanda"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Telefone Principal *</label>
                    <input
                      type="text"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Telefone Alternativo</label>
                    <input
                      type="text"
                      value={telefoneAlternativo}
                      onChange={(e) => setTelefoneAlternativo(e.target.value)}
                      placeholder="+244 912 000 000"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">E-mail Institucional (Login) *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="funcionario@escola.med.gov.ao"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. HABILITAÇÕES & CARREIRA MINISTERIAL */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-black text-blue-950 uppercase text-[11px] tracking-wide border-b pb-1.5 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                  <span>2. Habilitações Literárias & Carreira Ministerial (MED)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Grau Académico</label>
                    <select
                      value={grauAcademico}
                      onChange={(e) => setGrauAcademico(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Doutor">Doutoramento (PhD)</option>
                      <option value="Mestre">Mestrado</option>
                      <option value="Licenciado">Licenciatura (ISCED/Ensino Superior)</option>
                      <option value="Bacharel">Bacharelato</option>
                      <option value="Médio">Técnico Médio</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Especialidade / Curso de Formação</label>
                    <input
                      type="text"
                      value={especialidade}
                      onChange={(e) => setEspecialidade(e.target.value)}
                      placeholder="Ex: Ensino da Matemática"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Instituição de Habilitação</label>
                    <input
                      type="text"
                      value={habilitacoes}
                      onChange={(e) => setHabilitacoes(e.target.value)}
                      placeholder="Ex: ISCED Luanda / UAN"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Categoria Profissional MED</label>
                    <input
                      type="text"
                      value={categoriaProfissional}
                      onChange={(e) => setCategoriaProfissional(e.target.value)}
                      placeholder="Ex: Professor do IIº Ciclo - 6º Grau"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">N.º Mecanográfico / Agente</label>
                    <input
                      type="text"
                      value={numeroMecanografico}
                      onChange={(e) => setNumeroMecanografico(e.target.value)}
                      placeholder="Ex: AG-89412"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Cargo / Função *</label>
                    <input
                      type="text"
                      required
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      placeholder="Ex: Professor de Matemática"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Perfil de Acesso (Role) *</label>
                    <select
                      value={role}
                      onChange={(e) => {
                        const r = e.target.value as UserRole;
                        setRole(r);
                        if (r === 'Professor') setEhProfessor(true);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Professor">Professor (Lançamento de Notas, MAC, Pautas & Horários)</option>
                      <option value="SubdiretorPedagogico">Subdiretor Pedagógico (Gestão Pedagógica, Pautas & Assiduidade)</option>
                      <option value="SubdiretorAdministrativo">Subdiretor Administrativo (Finanças, Património & Logística)</option>
                      <option value="CoordenadorPedagogico">Coordenação Pedagógica (MAC, Apoio a Docentes & Júris)</option>
                      <option value="CoordenadorTurno">Coordenador de Turno (Turmas, Assiduidade & Turnos)</option>
                      <option value="ChefeSecretaria">Chefe de Secretaria (Processos, Pautas, Certificados & Perfis)</option>
                      <option value="Secretaria">Secretaria Escolar (Matrículas, Documentos & Passes)</option>
                      <option value="Secretario">Secretário (Atendimento, Documentação & Pautas)</option>
                      <option value="DiretorGeral">Diretor Geral (Direção Executiva Institucional)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Tipo de Contrato</label>
                    <select
                      value={tipoContrato}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Efetivo">Efetivo (Quadro Definitivo MED)</option>
                      <option value="Contratado">Contratado a Termo</option>
                      <option value="Colaborador">Docente Colaborador</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Situação Funcional</label>
                    <select
                      value={situacaoFuncional}
                      onChange={(e) => setSituacaoFuncional(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Ativo">Ativo no Efetivo</option>
                      <option value="Em Comissão de Serviço">Em Comissão de Serviço</option>
                      <option value="Licença de Parto">Licença de Maternidade/Parto</option>
                      <option value="Licença Sabática">Licença de Formação / Sabática</option>
                      <option value="Destacado">Destacado noutra Instituição</option>
                      <option value="Aposentado">Aposentado</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Data de Admissão</label>
                    <input
                      type="date"
                      value={dataAdmissao}
                      onChange={(e) => setDataAdmissao(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Carga Horária Semanal (horas)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={cargaHorariaSemanal}
                      onChange={(e) => setCargaHorariaSemanal(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="flex flex-col justify-end space-y-1">
                    <label className="flex items-center space-x-2 font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ehProfessor}
                        onChange={(e) => setEhProfessor(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Membro do Corpo Docente</span>
                    </label>
                    <label className="flex items-center space-x-2 font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ehAdministrativoQueLeciona}
                        onChange={(e) => setEhAdministrativoQueLeciona(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span>Administrativo que Leciona</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. DADOS BANCÁRIOS & SEGURANÇA SOCIAL */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-black text-blue-950 uppercase text-[11px] tracking-wide border-b pb-1.5 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                  <span>3. Dados Bancários & Segurança Social (INSS)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Instituição Bancária</label>
                    <input
                      type="text"
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      placeholder="Ex: BFA - Banco de Fomento Angola, BAI, BIC, BPC"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">IBAN Bancário Completo</label>
                    <input
                      type="text"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="AO06.0006.0000.1234.5678.9012.3"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">N.º de Segurança Social (INSS)</label>
                    <input
                      type="text"
                      value={numeroSegurancaSocial}
                      onChange={(e) => setNumeroSegurancaSocial(e.target.value)}
                      placeholder="Ex: INSS-481920"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">NIF (Número de Identificação Fiscal)</label>
                    <input
                      type="text"
                      value={nif}
                      onChange={(e) => setNif(e.target.value)}
                      placeholder="Ex: 001928374LA045"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. DADOS CLÍNICOS E DE SAÚDE DO COLABORADOR */}
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-3">
                <h4 className="font-black text-red-950 uppercase text-[11px] tracking-wide border-b border-red-200 pb-1.5 flex items-center space-x-1.5">
                  <HeartPulse className="h-3.5 w-3.5 text-red-600" />
                  <span>4. Ficha Médica e Dados de Saúde do Funcionário</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Grupo Sanguíneo</label>
                    <select
                      value={grupoSanguineo}
                      onChange={(e) => setGrupoSanguineo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg font-bold text-red-700 bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    >
                      <option value="O+">O+ (Dador Universal O Positivo)</option>
                      <option value="O-">O- (O Negativo)</option>
                      <option value="A+">A+ (A Positivo)</option>
                      <option value="A-">A- (A Negativo)</option>
                      <option value="B+">B+ (B Positivo)</option>
                      <option value="B-">B- (B Negativo)</option>
                      <option value="AB+">AB+ (Recetor Universal AB Positivo)</option>
                      <option value="AB-">AB- (AB Negativo)</option>
                      <option value="Não Sabido">Não Sabido / A Testar</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Alergias Conhecidas</label>
                    <input
                      type="text"
                      value={alergias}
                      onChange={(e) => setAlergias(e.target.value)}
                      placeholder="Ex: Penicilina, Dipirona, Pólen, Nenhuma"
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Doenças Crónicas / Cuidados</label>
                    <input
                      type="text"
                      value={doencasCronicas}
                      onChange={(e) => setDoencasCronicas(e.target.value)}
                      placeholder="Ex: Hipertensão, Diabetes, Asma, Nenhuma"
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Necessidades Especiais / Acessibilidade</label>
                    <input
                      type="text"
                      value={necessidadesEspeciais}
                      onChange={(e) => setNecessidadesEspeciais(e.target.value)}
                      placeholder="Ex: Nenhuma, Baixa Visão, Mobilidade Reduzida"
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Contacto de Emergência (Nome)</label>
                    <input
                      type="text"
                      value={contactoEmergenciaNome}
                      onChange={(e) => setContactoEmergenciaNome(e.target.value)}
                      placeholder="Ex: Cônjuge, Irmão, Filho"
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Contacto de Emergência (Telefone)</label>
                    <input
                      type="text"
                      value={contactoEmergenciaTelefone}
                      onChange={(e) => setContactoEmergenciaTelefone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full p-2 border border-gray-300 rounded-lg font-mono bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="font-bold text-gray-700 block mb-1">Data do Atestado Médico de Aptidão / Junta Médica</label>
                    <input
                      type="date"
                      value={atestadoMedicoData}
                      onChange={(e) => setAtestadoMedicoData(e.target.value)}
                      className="w-full sm:w-1/3 p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. CREDENCIAL DE ACESSO */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center space-x-1.5">
                    <Key className="h-3.5 w-3.5 text-blue-600" />
                    <span>Palavra-passe de Acesso *</span>
                  </label>
                  <button
                    type="button"
                    onClick={gerarSenhaForte}
                    className="text-[11px] text-blue-700 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Gerar Nova Senha</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNovoFuncionarioModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Salvar Dados Cadastrais Completos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHA INDIVIDUAL COMPLETA DO FUNCIONÁRIO (DOSSIER OFICIAL MED)       */}
      {/* ========================================================================= */}
      {showFichaModal && funcParaFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border-2 border-indigo-700 space-y-4 my-8 max-h-[95vh] overflow-y-auto">
            {/* Top Toolbar no-print */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 no-print">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-700" />
                <h3 className="text-base font-black text-gray-900">
                  Ficha Individual do Funcionário — Dossier Oficial
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleExportarFichaExcel(funcParaFicha)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Baixar Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportarFichaHTML(funcParaFicha)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-blue-700" />
                  <span>Baixar HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFichaModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Documento Formatado para Impressão */}
            <div id="ficha-funcionario-dossier" className="p-6 md:p-8 border-2 border-black rounded-xl space-y-5 bg-white text-black font-sans print:border-none print:p-0">
              <div className="text-center space-y-1 border-b-2 border-black pb-3">
                <div className="flex justify-center mb-1">
                  {configSistema.insigniaNacionalUrl ? (
                    <img src={configSistema.insigniaNacionalUrl} alt="Insígnia" className="h-14 w-14 object-contain mx-auto" />
                  ) : (
                    <InsigniaAngola size={52} />
                  )}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-900">REPÚBLICA DE ANGOLA</p>
                <p className="text-[10.5px] font-bold uppercase text-gray-800">{escola.governoProvincial || `GOVERNO PROVINCIAL DE ${escola.provincia?.toUpperCase() || 'LUANDA'}`}</p>
                <p className="text-[10.5px] font-bold uppercase text-gray-800">{escola.gabineteEducacao || 'GABINETE PROVINCIAL DA EDUCAÇÃO'}</p>
                <h2 className="text-base font-black uppercase text-gray-950 pt-1">{escola.nomeOficial}</h2>
                <div className="pt-2">
                  <span className="text-xs sm:text-sm font-black uppercase border-2 border-black px-6 py-1.5 inline-block bg-indigo-50">
                    FICHA INDIVIDUAL DE CADASTRO DO FUNCIONÁRIO E DOCENTE
                  </span>
                </div>
              </div>

              {/* Foto e Identificação */}
              <div className="flex flex-col sm:flex-row gap-5 items-start border-b border-black pb-4 text-xs">
                <img 
                  src={funcParaFicha.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'} 
                  alt={funcParaFicha.nomeCompleto} 
                  className="h-28 w-24 rounded-lg object-cover border-2 border-black shrink-0 mx-auto sm:mx-0 shadow-xs"
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 leading-relaxed">
                  <div><span className="text-gray-600 font-semibold">Nome Completo:</span> <strong className="uppercase">{funcParaFicha.nomeCompleto}</strong></div>
                  <div><span className="text-gray-600 font-semibold">N.º do Bilhete de Identidade:</span> <strong className="font-mono">{funcParaFicha.numeroBI}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Data Emissão BI:</span> <strong>{funcParaFicha.dataEmissaoBI || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Data Validade BI:</span> <strong>{funcParaFicha.dataValidadeBI || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Local de Emissão:</span> <strong>{funcParaFicha.localEmissaoBI || funcParaFicha.arquivoIdentificacao || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Gênero:</span> <strong>{funcParaFicha.genero === 'M' ? 'Masculino' : 'Feminino'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Data de Nascimento:</span> <strong>{funcParaFicha.dataNascimento || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Estado Civil:</span> <strong>{funcParaFicha.estadoCivil || 'Casado(a)'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Nacionalidade:</span> <strong>{funcParaFicha.nacionalidade || 'Angolana'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Naturalidade:</span> <strong>{funcParaFicha.naturalidadeMunicipio || funcParaFicha.provincia || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Filiação (Pai):</span> <strong>{funcParaFicha.nomePai || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Filiação (Mãe):</span> <strong>{funcParaFicha.nomeMae || '—'}</strong></div>
                  <div className="sm:col-span-2"><span className="text-gray-600 font-semibold">Residência / Bairro:</span> <strong>{funcParaFicha.residencia || funcParaFicha.bairro || '—'}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Telefone Principal:</span> <strong className="font-mono">{funcParaFicha.telefone}</strong></div>
                  <div><span className="text-gray-600 font-semibold">Telefone Alternativo:</span> <strong className="font-mono">{funcParaFicha.telefoneAlternativo || '—'}</strong></div>
                  <div className="sm:col-span-2"><span className="text-gray-600 font-semibold">Correio Electrónico:</span> <strong>{funcParaFicha.email}</strong></div>
                </div>
              </div>

              {/* Dados Académicos e Carreira */}
              <div className="border-b border-black pb-4 text-xs space-y-1.5">
                <h4 className="font-black uppercase text-[11px] text-gray-900 border-b border-gray-300 pb-1">Habilitações & Carreira Ministerial (MED)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded border border-gray-200">
                  <div><span className="text-gray-600">Grau Académico:</span> <strong>{funcParaFicha.grauAcademico || 'Licenciado'}</strong></div>
                  <div><span className="text-gray-600">Especialidade / Curso:</span> <strong>{funcParaFicha.especialidade || funcParaFicha.habilitacoes}</strong></div>
                  <div><span className="text-gray-600">Categoria Profissional:</span> <strong>{funcParaFicha.categoriaProfissional || 'Professor do IIº Ciclo do Ensino Secundário - 6º Grau'}</strong></div>
                  <div><span className="text-gray-600">Cargo / Função Atual:</span> <strong>{funcParaFicha.cargo}</strong></div>
                  <div><span className="text-gray-600">Perfil de Acesso no Sistema:</span> <strong className="text-blue-900">{funcParaFicha.role}</strong></div>
                  <div><span className="text-gray-600">N.º Mecanográfico / Agente:</span> <strong className="font-mono">{funcParaFicha.numeroAgente || 'AG-89412'}</strong></div>
                  <div><span className="text-gray-600">Tipo de Contrato:</span> <strong>{funcParaFicha.tipoContrato || 'Efetivo (Quadro Definitivo MED)'}</strong></div>
                  <div><span className="text-gray-600">Situação Funcional:</span> <strong className="text-emerald-800">{funcParaFicha.situacaoFuncional || 'Ativo no Efetivo'}</strong></div>
                  <div><span className="text-gray-600">Data de Admissão:</span> <strong>{funcParaFicha.dataAdmissao || '2020-02-01'}</strong></div>
                  <div><span className="text-gray-600">Carga Horária Semanal:</span> <strong>{funcParaFicha.cargaHorariaSemanal || 24} horas/semana</strong></div>
                </div>
              </div>

              {/* Dados Bancários e Segurança Social */}
              <div className="border-b border-black pb-4 text-xs space-y-1.5">
                <h4 className="font-black uppercase text-[11px] text-gray-900 border-b border-gray-300 pb-1">Dados Bancários & Segurança Social (INSS)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div><span className="text-gray-600 block">Instituição Bancária:</span><strong>{funcParaFicha.banco || 'BFA - Banco de Fomento Angola'}</strong></div>
                  <div className="sm:col-span-2"><span className="text-gray-600 block">IBAN Bancário:</span><strong className="font-mono">{funcParaFicha.iban || 'AO06.0006.0000.1234.5678.9012.3'}</strong></div>
                  <div><span className="text-gray-600 block">N.º de Segurança Social (INSS):</span><strong className="font-mono">{funcParaFicha.numeroSegurancaSocial || 'INSS-481920'}</strong></div>
                  <div><span className="text-gray-600 block">NIF Fiscal:</span><strong className="font-mono">{funcParaFicha.nif || funcParaFicha.numeroBI}</strong></div>
                  <div><span className="text-gray-600 block">Data de Registo:</span><strong>{funcParaFicha.dataCriacao || '2025/2026'}</strong></div>
                </div>
              </div>

              {/* Assinaturas Oficiais */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-6">
                  <p className="text-gray-700">O(A) Funcionário(a)</p>
                  <div className="border-b border-black w-40 mx-auto" />
                </div>
                <div className="space-y-6">
                  <p className="text-gray-700">O Chefe de Secretaria</p>
                  <div className="border-b border-black w-40 mx-auto" />
                </div>
                <div className="space-y-6">
                  <p className="text-gray-700">O Director Geral</p>
                  <div className="border-b border-black w-40 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ver / Redefinir Senha do Funcionário */}
      {modalSenhaOpen && funcSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center space-x-2 text-blue-600 mb-3">
              <Key className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-gray-900">Credenciais do Funcionário</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 font-semibold block">Nome do Colaborador:</span>
                <span className="font-bold text-gray-900">{funcSelecionado.nomeCompleto}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Email de Login:</span>
                <span className="font-bold text-blue-700">{funcSelecionado.email}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Perfil de Acesso:</span>
                <span className="font-bold text-gray-800">{funcSelecionado.role}</span>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-800">Palavra-passe de Acesso:</label>
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
    </div>
  );
};
