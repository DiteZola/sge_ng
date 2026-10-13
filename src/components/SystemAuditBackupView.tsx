import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Database, 
  FileSpreadsheet, 
  Building, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  RefreshCw,
  Server,
  Cloud,
  HardDrive,
  Image as ImageIcon,
  CheckCircle2,
  X,
  FileCheck,
  Building2,
  Lock,
  Unlock,
  Search,
  Eye,
  UserCog,
  UserCheck,
  Key,
  Users,
  ShieldAlert,
  FileText,
  Calculator,
  Compass,
  MapPin,
  Globe,
  Sliders,
  Scale,
  GraduationCap,
  Sparkles,
  Award,
  Info
} from 'lucide-react';
import { LogAuditoria, Escola, Funcionario, Aluno, ConfiguracaoSistema, UserRole, RegraCalculoMAC, NivelEnsino } from '../types';
import { dbService } from '../services/storage';
import { locationService } from '../services/locationService';
import { InsigniaAngola } from '../constants/insignia';
import { DocumentTemplateConfigModal } from './DocumentTemplateConfigModal';
import { avaliarExpressaoNota } from '../services/macEngine';
import { comprimirImagemBase64 } from '../utils/imageOptimizer';

interface SystemAuditBackupViewProps {
  escola: Escola;
  currentUser: Funcionario;
  logs: LogAuditoria[];
  alunos: Aluno[];
  funcionarios: Funcionario[];
  initialTab?: 'backup_restauracao' | 'interruptores_configuracao' | 'configuracoes_globais' | 'logotipo_escola' | 'auditoria' | 'excel' | 'usuarios_perfis' | 'dizeres_documentos' | 'formulas_notas' | 'geografia_territorio';
  onLimparLogs: () => void;
  onRestaurarBackup?: (jsonStr: string) => void;
  onAtualizarEscola?: (escola: Escola) => void;
  onSalvarFuncionario?: (func: Funcionario) => void;
}

export const SystemAuditBackupView: React.FC<SystemAuditBackupViewProps> = ({
  escola,
  currentUser,
  logs,
  alunos,
  funcionarios,
  initialTab,
  onLimparLogs,
  onRestaurarBackup,
  onAtualizarEscola,
  onSalvarFuncionario
}) => {
  const isAdminGeral = currentUser.role === 'AdminGeral';
  const isDiretorGeral = currentUser.role === 'DiretorGeral' || isAdminGeral;

  const [activeTab, setActiveTab] = useState<'backup_restauracao' | 'interruptores_configuracao' | 'configuracoes_globais' | 'logotipo_escola' | 'auditoria' | 'excel' | 'usuarios_perfis' | 'dizeres_documentos' | 'formulas_notas' | 'geografia_territorio'>(initialTab || 'backup_restauracao');
  const [modalConfigDocOpen, setModalConfigDocOpen] = useState(false);
  const [docConfigSelecionado, setDocConfigSelecionado] = useState('pauta_trimestral');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [filtroAcao, setFiltroAcao] = useState('TODAS');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Configuração Global do Sistema
  const [configSistema, setConfigSistema] = useState<ConfiguracaoSistema>(() => dbService.getConfiguracaoSistema());
  const [insigniaPreview, setInsigniaPreview] = useState<string>(configSistema.insigniaNacionalUrl || '');

  // Logotipo da Escola do Diretor
  const [escolaData, setEscolaData] = useState<Escola>(escola);
  const [logotipoPreview, setLogotipoPreview] = useState<string>(escola.logotipoUrl || escola.logotipo || '');

  const notificar = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // ==========================================
  // ESTADO & AÇÕES: EDITOR DE FÓRMULAS DE NOTAS
  // ==========================================
  const [regrasMAC, setRegrasMAC] = useState<RegraCalculoMAC[]>(() => dbService.getRegrasMAC());
  const [nivelFormulaSelecionado, setNivelFormulaSelecionado] = useState<NivelEnsino>('ICiclo');

  const [formulaTipoCalculo, setFormulaTipoCalculo] = useState<'ARITMETICA_SIMPLES' | 'PONDERADA_POR_TIPO' | 'FORMULA_CUSTOMIZADA'>('PONDERADA_POR_TIPO');
  const [minAvaliacoes, setMinAvaliacoes] = useState(3);
  const [descartarMenor, setDescartarMenor] = useState(false);

  // 1º e 2º Trimestres (Iniciais)
  const [tipoCalc1e2, setTipoCalc1e2] = useState<'ARITMETICA_SIMPLES' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA'>('PONDERADA_PESOS');
  const [pesoMac1e2, setPesoMac1e2] = useState<number>(40);
  const [pesoNpp1e2, setPesoNpp1e2] = useState<number>(30);
  const [pesoNpt1e2, setPesoNpt1e2] = useState<number>(30);
  const [expressaoCustom1e2, setExpressaoCustom1e2] = useState<string>('(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');

  // 3º Trimestre (Diferenciação de Encerramento)
  const [diferenciar3Tri, setDiferenciar3Tri] = useState<boolean>(true);
  const [tipoCalc3, setTipoCalc3] = useState<'ARITMETICA_SIMPLES' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA'>('PONDERADA_PESOS');
  const [pesoMac3, setPesoMac3] = useState<number>(30);
  const [pesoNpp3, setPesoNpp3] = useState<number>(30);
  const [pesoNpt3, setPesoNpt3] = useState<number>(40);
  const [expressaoCustom3, setExpressaoCustom3] = useState<string>('(MAC * 0.3) + (NPP * 0.3) + (NPT * 0.4)');

  // Classes Não Finais (Transição - Média Final Anual)
  const [tipoCalcNaoFinais, setTipoCalcNaoFinais] = useState<'ARITMETICA_SIMPLES' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA'>('ARITMETICA_SIMPLES');
  const [pesoMFT1, setPesoMFT1] = useState<number>(33);
  const [pesoMFT2, setPesoMFT2] = useState<number>(33);
  const [pesoMFT3, setPesoMFT3] = useState<number>(34);
  const [expressaoCustomNaoFinais, setExpressaoCustomNaoFinais] = useState<string>('(MT1 + MT2 + MT3) / 3');

  // Classes Finais com Exame (MF com Exame Nacional)
  const [classesFinaisSelecionadas, setClassesFinaisSelecionadas] = useState<string[]>(['6ª', '9ª', '12ª', '13ª']);
  const [tipoCalcFinais, setTipoCalcFinais] = useState<'PADRAO_MED' | 'PONDERADA_PESOS' | 'FORMULA_CUSTOMIZADA'>('PADRAO_MED');
  const [pesoMDF, setPesoMDF] = useState<number>(40);
  const [pesoNE, setPesoNE] = useState<number>(60);
  const [expressaoCustomFinais, setExpressaoCustomFinais] = useState<string>('(MDF * 0.4) + (NE * 0.6)');
  const [notaAprovacaoMin, setNotaAprovacaoMin] = useState<number>(10);
  const [notaRecursoMin, setNotaRecursoMin] = useState<number>(7);

  // Simulador Interativo em Tempo Real
  const [simMAC1, setSimMAC1] = useState<number>(14);
  const [simNPP1, setSimNPP1] = useState<number>(15);
  const [simNPT1, setSimNPT1] = useState<number>(16);

  const [simMAC2, setSimMAC2] = useState<number>(13);
  const [simNPP2, setSimNPP2] = useState<number>(14);
  const [simNPT2, setSimNPT2] = useState<number>(15);

  const [simMAC3, setSimMAC3] = useState<number>(15);
  const [simNPP3, setSimNPP3] = useState<number>(16);
  const [simNPT3, setSimNPT3] = useState<number>(17);

  const [simNE, setSimNE] = useState<number>(14);

  // Sincronização automática ao selecionar outro nível de ensino
  useEffect(() => {
    const r = regrasMAC.find(reg => reg.nivelEnsino === nivelFormulaSelecionado);
    const escala = nivelFormulaSelecionado === 'Primario' ? 10 : 20;
    const padraoAprov = escala === 10 ? 5 : 10;
    const padraoRecurso = escala === 10 ? 4 : 7;
    
    if (r) {
      setFormulaTipoCalculo(r.formulaTipo || 'PONDERADA_POR_TIPO');
      setMinAvaliacoes(r.minAvaliacoesExigidas || (nivelFormulaSelecionado === 'Primario' ? 2 : 3));
      setDescartarMenor(!!r.descartarMenorNota);

      // 1º e 2º Trimestres
      setTipoCalc1e2(r.tipoCalculoPrimeirosTrimestres || (r.pesosPrimeirosTrimestres || r.pesosTrimestre ? 'PONDERADA_PESOS' : 'ARITMETICA_SIMPLES'));
      const p1 = r.pesosPrimeirosTrimestres || r.pesosTrimestre;
      setPesoMac1e2(p1?.mac !== undefined ? p1.mac : 40);
      setPesoNpp1e2(p1?.npp !== undefined ? p1.npp : 30);
      setPesoNpt1e2(p1?.npt !== undefined ? p1.npt : 30);
      setExpressaoCustom1e2(r.formulaPrimeirosTrimestres || r.formula1Trimestre || '(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');

      // 3º Trimestre
      setDiferenciar3Tri(Boolean(r.pesosTerceiroTrimestre || r.formulaTerceiroTrimestre || r.formula3Trimestre));
      setTipoCalc3(r.tipoCalculoTerceiroTrimestre || (r.pesosTerceiroTrimestre ? 'PONDERADA_PESOS' : 'ARITMETICA_SIMPLES'));
      const p3 = r.pesosTerceiroTrimestre || r.pesosTrimestre;
      setPesoMac3(p3?.mac !== undefined ? p3.mac : 30);
      setPesoNpp3(p3?.npp !== undefined ? p3.npp : 30);
      setPesoNpt3(p3?.npt !== undefined ? p3.npt : 40);
      setExpressaoCustom3(r.formulaTerceiroTrimestre || r.formula3Trimestre || '(MAC * 0.3) + (NPP * 0.3) + (NPT * 0.4)');

      // Classes Não Finais
      setTipoCalcNaoFinais(r.tipoCalculoClassesNaoFinais || (r.pesosTrimestresMF ? 'PONDERADA_PESOS' : (r.formulaMediaGeralClasse ? 'FORMULA_CUSTOMIZADA' : 'ARITMETICA_SIMPLES')));
      const pMF = r.pesosTrimestresMF;
      setPesoMFT1(pMF?.t1 !== undefined ? pMF.t1 : 33);
      setPesoMFT2(pMF?.t2 !== undefined ? pMF.t2 : 33);
      setPesoMFT3(pMF?.t3 !== undefined ? pMF.t3 : 34);
      setExpressaoCustomNaoFinais(r.formulaMediaGeralClasse || '(MT1 + MT2 + MT3) / 3');

      // Classes Finais com Exame
      setClassesFinaisSelecionadas(r.classesFinaisConfiguradas || (nivelFormulaSelecionado === 'Primario' ? ['6ª'] : nivelFormulaSelecionado === 'ICiclo' ? ['9ª'] : ['12ª', '13ª']));
      setTipoCalcFinais(r.tipoCalculoClassesFinais || (r.formulaClassesFinaisExame ? 'FORMULA_CUSTOMIZADA' : 'PADRAO_MED'));
      setPesoMDF(r.pesoMDFClassesFinais !== undefined ? r.pesoMDFClassesFinais : 40);
      setPesoNE(r.pesoNEClassesFinais !== undefined ? r.pesoNEClassesFinais : 60);
      setExpressaoCustomFinais(r.formulaClassesFinaisExame || '(MDF * 0.4) + (NE * 0.6)');
      setNotaAprovacaoMin(r.notaMinimaAprovacao !== undefined ? r.notaMinimaAprovacao : padraoAprov);
      setNotaRecursoMin(r.notaMinimaExameRecurso !== undefined ? r.notaMinimaExameRecurso : padraoRecurso);
    } else {
      setMinAvaliacoes(nivelFormulaSelecionado === 'Primario' ? 2 : 3);
      setDescartarMenor(false);
      setTipoCalc1e2('PONDERADA_PESOS');
      setPesoMac1e2(40);
      setPesoNpp1e2(30);
      setPesoNpt1e2(30);
      setExpressaoCustom1e2('(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');

      setDiferenciar3Tri(true);
      setTipoCalc3('PONDERADA_PESOS');
      setPesoMac3(30);
      setPesoNpp3(30);
      setPesoNpt3(40);
      setExpressaoCustom3('(MAC * 0.3) + (NPP * 0.3) + (NPT * 0.4)');

      setTipoCalcNaoFinais('ARITMETICA_SIMPLES');
      setPesoMFT1(33);
      setPesoMFT2(33);
      setPesoMFT3(34);
      setExpressaoCustomNaoFinais('(MT1 + MT2 + MT3) / 3');

      setClassesFinaisSelecionadas(nivelFormulaSelecionado === 'Primario' ? ['6ª'] : nivelFormulaSelecionado === 'ICiclo' ? ['9ª'] : ['12ª', '13ª']);
      setTipoCalcFinais('PADRAO_MED');
      setPesoMDF(40);
      setPesoNE(60);
      setExpressaoCustomFinais('(MDF * 0.4) + (NE * 0.6)');
      setNotaAprovacaoMin(padraoAprov);
      setNotaRecursoMin(padraoRecurso);
    }

    const simPadrao = escala === 10 ? 7 : 14;
    setSimMAC1(simPadrao);
    setSimNPP1(simPadrao + (escala === 10 ? 0.5 : 1));
    setSimNPT1(simPadrao + (escala === 10 ? 1 : 2));
    setSimMAC2(simPadrao);
    setSimNPP2(simPadrao + (escala === 10 ? 0.5 : 1));
    setSimNPT2(simPadrao + (escala === 10 ? 1 : 2));
    setSimMAC3(simPadrao + (escala === 10 ? 0.5 : 1));
    setSimNPP3(simPadrao + (escala === 10 ? 1 : 2));
    setSimNPT3(simPadrao + (escala === 10 ? 1.5 : 3));
    setSimNE(simPadrao + (escala === 10 ? 1 : 2));
  }, [nivelFormulaSelecionado, regrasMAC]);

  // Cálculos do Simulador Interativo em Tempo Real
  const escalaMaximaNivel = nivelFormulaSelecionado === 'Primario' ? 10 : 20;

  const simCalcMT1 = useMemo(() => {
    if (tipoCalc1e2 === 'ARITMETICA_SIMPLES') {
      return Number(Math.min(escalaMaximaNivel, (simMAC1 + simNPP1 + simNPT1) / 3).toFixed(1));
    }
    if (tipoCalc1e2 === 'FORMULA_CUSTOMIZADA') {
      const r = avaliarExpressaoNota(expressaoCustom1e2, { MAC: simMAC1, NPP: simNPP1, NPT: simNPT1 });
      return r !== null ? Number(Math.min(escalaMaximaNivel, Math.max(0, r)).toFixed(1)) : 0;
    }
    const tot = (pesoMac1e2 + pesoNpp1e2 + pesoNpt1e2) || 100;
    return Number(Math.min(escalaMaximaNivel, ((simMAC1 * pesoMac1e2) + (simNPP1 * pesoNpp1e2) + (simNPT1 * pesoNpt1e2)) / tot).toFixed(1));
  }, [tipoCalc1e2, simMAC1, simNPP1, simNPT1, pesoMac1e2, pesoNpp1e2, pesoNpt1e2, expressaoCustom1e2, escalaMaximaNivel]);

  const simCalcMT2 = useMemo(() => {
    if (tipoCalc1e2 === 'ARITMETICA_SIMPLES') {
      return Number(Math.min(escalaMaximaNivel, (simMAC2 + simNPP2 + simNPT2) / 3).toFixed(1));
    }
    if (tipoCalc1e2 === 'FORMULA_CUSTOMIZADA') {
      const r = avaliarExpressaoNota(expressaoCustom1e2, { MAC: simMAC2, NPP: simNPP2, NPT: simNPT2 });
      return r !== null ? Number(Math.min(escalaMaximaNivel, Math.max(0, r)).toFixed(1)) : 0;
    }
    const tot = (pesoMac1e2 + pesoNpp1e2 + pesoNpt1e2) || 100;
    return Number(Math.min(escalaMaximaNivel, ((simMAC2 * pesoMac1e2) + (simNPP2 * pesoNpp1e2) + (simNPT2 * pesoNpt1e2)) / tot).toFixed(1));
  }, [tipoCalc1e2, simMAC2, simNPP2, simNPT2, pesoMac1e2, pesoNpp1e2, pesoNpt1e2, expressaoCustom1e2, escalaMaximaNivel]);

  const simCalcMT3 = useMemo(() => {
    if (!diferenciar3Tri) {
      if (tipoCalc1e2 === 'ARITMETICA_SIMPLES') return Number(Math.min(escalaMaximaNivel, (simMAC3 + simNPP3 + simNPT3) / 3).toFixed(1));
      if (tipoCalc1e2 === 'FORMULA_CUSTOMIZADA') {
        const r = avaliarExpressaoNota(expressaoCustom1e2, { MAC: simMAC3, NPP: simNPP3, NPT: simNPT3 });
        return r !== null ? Number(Math.min(escalaMaximaNivel, Math.max(0, r)).toFixed(1)) : 0;
      }
      const tot = (pesoMac1e2 + pesoNpp1e2 + pesoNpt1e2) || 100;
      return Number(Math.min(escalaMaximaNivel, ((simMAC3 * pesoMac1e2) + (simNPP3 * pesoNpp1e2) + (simNPT3 * pesoNpt1e2)) / tot).toFixed(1));
    }
    if (tipoCalc3 === 'ARITMETICA_SIMPLES') {
      return Number(Math.min(escalaMaximaNivel, (simMAC3 + simNPP3 + simNPT3) / 3).toFixed(1));
    }
    if (tipoCalc3 === 'FORMULA_CUSTOMIZADA') {
      const r = avaliarExpressaoNota(expressaoCustom3, { MAC: simMAC3, NPP: simNPP3, NPT: simNPT3 });
      return r !== null ? Number(Math.min(escalaMaximaNivel, Math.max(0, r)).toFixed(1)) : 0;
    }
    const tot = (pesoMac3 + pesoNpp3 + pesoNpt3) || 100;
    return Number(Math.min(escalaMaximaNivel, ((simMAC3 * pesoMac3) + (simNPP3 * pesoNpp3) + (simNPT3 * pesoNpt3)) / tot).toFixed(1));
  }, [diferenciar3Tri, tipoCalc3, tipoCalc1e2, simMAC3, simNPP3, simNPT3, pesoMac3, pesoNpp3, pesoNpt3, pesoMac1e2, pesoNpp1e2, pesoNpt1e2, expressaoCustom3, expressaoCustom1e2, escalaMaximaNivel]);

  const simCalcMDF = useMemo(() => {
    return Number(((simCalcMT1 + simCalcMT2 + simCalcMT3) / 3).toFixed(1));
  }, [simCalcMT1, simCalcMT2, simCalcMT3]);

  const simCalcMF_NaoFinais = useMemo(() => {
    if (tipoCalcNaoFinais === 'FORMULA_CUSTOMIZADA') {
      const r = avaliarExpressaoNota(expressaoCustomNaoFinais, { MT1: simCalcMT1, MT2: simCalcMT2, MT3: simCalcMT3 });
      return r !== null ? Number(Math.min(escalaMaximaNivel, Math.max(0, r)).toFixed(1)) : 0;
    }
    if (tipoCalcNaoFinais === 'PONDERADA_PESOS') {
      const tot = (pesoMFT1 + pesoMFT2 + pesoMFT3) || 100;
      return Number(Math.min(escalaMaximaNivel, ((simCalcMT1 * pesoMFT1) + (simCalcMT2 * pesoMFT2) + (simCalcMT3 * pesoMFT3)) / tot).toFixed(1));
    }
    return simCalcMDF;
  }, [tipoCalcNaoFinais, simCalcMT1, simCalcMT2, simCalcMT3, simCalcMDF, pesoMFT1, pesoMFT2, pesoMFT3, expressaoCustomNaoFinais, escalaMaximaNivel]);

  const simCalcMF_Finais = useMemo(() => {
    if (tipoCalcFinais === 'FORMULA_CUSTOMIZADA') {
      const r = avaliarExpressaoNota(expressaoCustomFinais, { MDF: simCalcMDF, NE: simNE, EXAME: simNE, MT1: simCalcMT1, MT2: simCalcMT2, MT3: simCalcMT3 });
      return r !== null ? Number(Math.min(escalaMaximaNivel, Math.max(0, r)).toFixed(1)) : 0;
    }
    const tot = (pesoMDF + pesoNE) || 100;
    return Number(Math.min(escalaMaximaNivel, ((simCalcMDF * pesoMDF) + (simNE * pesoNE)) / tot).toFixed(1));
  }, [tipoCalcFinais, simCalcMDF, simNE, pesoMDF, pesoNE, expressaoCustomFinais, escalaMaximaNivel]);

  const handleSalvarRegrasFormulaOficial = (e: React.FormEvent) => {
    e.preventDefault();
    const idRegra = `regra-${nivelFormulaSelecionado.toLowerCase()}`;
    const regraExistente = regrasMAC.find(r => r.nivelEnsino === nivelFormulaSelecionado);

    const novaRegra: RegraCalculoMAC = {
      id: regraExistente?.id || idRegra,
      escolaId: escola.id,
      nivelEnsino: nivelFormulaSelecionado,
      classe: 'Todas',
      formulaTipo: formulaTipoCalculo,
      minAvaliacoesExigidas: minAvaliacoes,
      maxAvaliacoesPermitidas: 15,
      descartarMenorNota: descartarMenor,
      
      // 1º e 2º Trimestres
      tipoCalculoPrimeirosTrimestres: tipoCalc1e2,
      pesosPrimeirosTrimestres: { mac: pesoMac1e2, npp: pesoNpp1e2, npt: pesoNpt1e2 },
      pesosTrimestre: { mac: pesoMac1e2, npp: pesoNpp1e2, npt: pesoNpt1e2 },
      formulaPrimeirosTrimestres: expressaoCustom1e2,
      formula1Trimestre: expressaoCustom1e2,
      formula2Trimestre: expressaoCustom1e2,

      // 3º Trimestre
      tipoCalculoTerceiroTrimestre: tipoCalc3,
      pesosTerceiroTrimestre: diferenciar3Tri 
        ? { mac: pesoMac3, npp: pesoNpp3, npt: pesoNpt3 }
        : { mac: pesoMac1e2, npp: pesoNpp1e2, npt: pesoNpt1e2 },
      formulaTerceiroTrimestre: expressaoCustom3,
      formula3Trimestre: expressaoCustom3,

      // Classes Não Finais (Transição)
      tipoCalculoClassesNaoFinais: tipoCalcNaoFinais,
      pesosTrimestresMF: { t1: pesoMFT1, t2: pesoMFT2, t3: pesoMFT3 },
      formulaMediaGeralClasse: expressaoCustomNaoFinais,

      // Classes Finais com Exame
      tipoCalculoClassesFinais: tipoCalcFinais,
      pesoMDFClassesFinais: pesoMDF,
      pesoNEClassesFinais: pesoNE,
      formulaClassesFinaisExame: expressaoCustomFinais,
      classesFinaisConfiguradas: classesFinaisSelecionadas,
      notaMinimaAprovacao: notaAprovacaoMin,
      notaMinimaExameRecurso: notaRecursoMin,

      versao: (regraExistente?.versao || 1) + 1,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: currentUser.nomeCompleto
    };

    dbService.salvarRegraMAC(novaRegra);
    setRegrasMAC(dbService.getRegrasMAC());
    notificar(`Regras e pesos de cálculo para ${nivelFormulaSelecionado === 'Primario' ? 'Ensino Primário' : nivelFormulaSelecionado === 'ICiclo' ? 'Iº Ciclo' : 'IIº Ciclo'} gravadas com sucesso (v${novaRegra.versao})! O motor pedagógico foi atualizado.`);
  };

  const handleRestaurarPadraoMED = () => {
    const esc = nivelFormulaSelecionado === 'Primario' ? 10 : 20;
    setFormulaTipoCalculo('PONDERADA_POR_TIPO');
    setMinAvaliacoes(nivelFormulaSelecionado === 'Primario' ? 2 : 3);
    setDescartarMenor(false);

    setTipoCalc1e2('PONDERADA_PESOS');
    setPesoMac1e2(40);
    setPesoNpp1e2(30);
    setPesoNpt1e2(30);
    setExpressaoCustom1e2('(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)');

    setDiferenciar3Tri(true);
    setTipoCalc3('PONDERADA_PESOS');
    setPesoMac3(30);
    setPesoNpp3(30);
    setPesoNpt3(40);
    setExpressaoCustom3('(MAC * 0.3) + (NPP * 0.3) + (NPT * 0.4)');

    setTipoCalcNaoFinais('ARITMETICA_SIMPLES');
    setPesoMFT1(33);
    setPesoMFT2(33);
    setPesoMFT3(34);
    setExpressaoCustomNaoFinais('(MT1 + MT2 + MT3) / 3');

    setClassesFinaisSelecionadas(nivelFormulaSelecionado === 'Primario' ? ['6ª'] : nivelFormulaSelecionado === 'ICiclo' ? ['9ª'] : ['12ª', '13ª']);
    setTipoCalcFinais('PADRAO_MED');
    setPesoMDF(40);
    setPesoNE(60);
    setExpressaoCustomFinais('(MDF * 0.4) + (NE * 0.6)');
    setNotaAprovacaoMin(esc === 10 ? 5 : 10);
    setNotaRecursoMin(esc === 10 ? 4 : 7);

    notificar('Padrão oficial do Ministério da Educação (MED Angola) restaurado no formulário. Clique em "Salvar Regras Oficiais" para aplicar.');
  };

  // ==========================================
  // ESTADO & AÇÕES: USUÁRIOS & PERFIS RBAC
  // ==========================================
  const [listaUsuarios, setListaUsuarios] = useState<Funcionario[]>(() => {
    return isAdminGeral 
      ? dbService.obterFuncionarios() 
      : dbService.obterFuncionarios().filter(f => f.escolaId === escola.id);
  });
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [filtroRoleUsuario, setFiltroRoleUsuario] = useState<string>('TODOS');
  const [filtroStatusUsuario, setFiltroStatusUsuario] = useState<string>('TODOS');
  const [usuarioParaRedefinir, setUsuarioParaRedefinir] = useState<Funcionario | null>(null);
  const [novaSenhaInput, setNovaSenhaInput] = useState('');
  const [showNovoUsuarioModal, setShowNovoUsuarioModal] = useState(false);
  const [novoUserNome, setNovoUserNome] = useState('');
  const [novoUserBI, setNovoUserBI] = useState('');
  const [novoUserEmail, setNovoUserEmail] = useState('');
  const [novoUserTelefone, setNovoUserTelefone] = useState('+244 923 000 000');
  const [novoUserCargo, setNovoUserCargo] = useState('Professor');
  const [novoUserRole, setNovoUserRole] = useState<UserRole>('Professor');
  const [novoUserSenha, setNovoUserSenha] = useState('Educa2026!');

  const handleAlternarStatusUsuario = (usuario: Funcionario) => {
    const novoStatus: 'Ativa' | 'Suspensa' = usuario.statusConta === 'Suspensa' ? 'Ativa' : 'Suspensa';
    try {
      dbService.atualizarStatusFuncionario(usuario.id, novoStatus);
      const atualizados = listaUsuarios.map(u => 
        u.id === usuario.id ? { ...u, statusConta: novoStatus, ativo: novoStatus === 'Ativa' } : u
      );
      setListaUsuarios(atualizados);
      notificar(`Conta de ${usuario.nomeCompleto} definida como "${novoStatus}".`);
    } catch {
      alert('Erro ao atualizar status do usuário.');
    }
  };

  const handleSalvarRedefinicaoSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaRedefinir || !novaSenhaInput.trim()) return;
    try {
      dbService.redefinirSenhaFuncionario(usuarioParaRedefinir.id, novaSenhaInput.trim());
      dbService.registarLog(
        'Redefinição de Credencial',
        `Palavra-passe de ${usuarioParaRedefinir.nomeCompleto} (${usuarioParaRedefinir.email}) redefinida por ${currentUser.nomeCompleto}.`
      );
      notificar(`Palavra-passe de ${usuarioParaRedefinir.nomeCompleto} redefinida com sucesso.`);
      setUsuarioParaRedefinir(null);
      setNovaSenhaInput('');
    } catch {
      alert('Erro ao redefinir palavra-passe.');
    }
  };

  const handleCriarNovoUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUserNome.trim() || !novoUserEmail.trim() || !novoUserBI.trim()) {
      alert('Preencha os campos obrigatórios (Nome, BI e Email).');
      return;
    }
    try {
      const novo = dbService.criarFuncionarioComCredenciais({
        escolaId: escola.id,
        nomeCompleto: novoUserNome.trim(),
        numeroBI: novoUserBI.trim().toUpperCase(),
        email: novoUserEmail.trim().toLowerCase(),
        telefone: novoUserTelefone.trim(),
        cargo: novoUserCargo.trim(),
        role: novoUserRole,
        password: novoUserSenha || 'Educa2026!',
        ehProfessor: novoUserRole === 'Professor',
        ehAdministrativoQueLeciona: false,
        genero: 'M',
        habilitacoes: 'Licenciatura',
        criadoPorNome: currentUser.nomeCompleto
      });
      setListaUsuarios([novo, ...listaUsuarios]);
      if (onSalvarFuncionario) onSalvarFuncionario(novo);
      setShowNovoUsuarioModal(false);
      setNovoUserNome('');
      setNovoUserBI('');
      setNovoUserEmail('');
      notificar(`Utilizador ${novo.nomeCompleto} cadastrado com perfil ${novo.role}.`);
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar novo usuário.');
    }
  };

  // Upload da Insígnia Nacional a partir do dispositivo (Admin Geral)
  const handleInsigniaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um ficheiro de imagem válido (PNG, JPG, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        // Compressão automática com canvas para evitar estouro de 1MB do Firestore e acelerar o app
        const base64Otimizado = await comprimirImagemBase64(base64, 440, 0.82);
        setInsigniaPreview(base64Otimizado);
        const novaConfig = { ...configSistema, insigniaNacionalUrl: base64Otimizado, insigniaOtimizada: true };
        dbService.salvarConfiguracaoSistema(novaConfig);
        setConfigSistema(novaConfig);
        notificar('Insígnia da República de Angola carregada, otimizada e sincronizada com sucesso.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Restaurar Insígnia Padrão Vetorial do MED
  const handleRestaurarInsigniaPadrao = () => {
    setInsigniaPreview('');
    const novaConfig = { ...configSistema, insigniaNacionalUrl: '', insigniaChunksCount: 0 };
    dbService.salvarConfiguracaoSistema(novaConfig);
    setConfigSistema(novaConfig);
    notificar('Restaurada a Insígnia Nacional vetorial oficial padrão.');
  };

  // Upload do Logotipo Escolar a partir do dispositivo (Diretor Geral)
  const handleLogotipoEscolaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um ficheiro de imagem válido (PNG, JPG, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        // Compressão automática com canvas para logótipos escolares
        const base64Otimizado = await comprimirImagemBase64(base64, 400, 0.82);
        setLogotipoPreview(base64Otimizado);
        const escolaAtualizada: Escola = { ...escolaData, logotipo: base64Otimizado, logotipoUrl: base64Otimizado };
        dbService.salvarEscola(escolaAtualizada);
        setEscolaData(escolaAtualizada);
        if (onAtualizarEscola) onAtualizarEscola(escolaAtualizada);
        notificar(`Logotipo de "${escola.nomeOficial}" otimizado e atualizado para exibição em passes e boletins.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Exportar Backup JSON Completo
  const handleExportBackup = () => {
    dbService.gerarBackupJSON();
    notificar('Ficheiro de backup JSON gerado e transferido para o seu dispositivo.');
  };

  // Importar / Restaurar Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const sucesso = dbService.restaurarBackupJSON(content);
        if (sucesso) {
          if (onRestaurarBackup) onRestaurarBackup(content);
          alert('Cópia de segurança restaurada com sucesso! A aplicação será reiniciada.');
          window.location.reload();
        } else {
          alert('Erro ao restaurar cópia de segurança. O ficheiro não possui um formato JSON válido do SGE-NG.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Forçar Sincronização Nuvem / Offline
  const handleSincronizarNuvem = async () => {
    notificar('A sincronizar dados com o Firebase e armazenamento offline...');
    const res = await dbService.sincronizarComFirebase();
    notificar(res.mensagem);
    setConfigSistema(dbService.getConfiguracaoSistema());
  };

  // Alternar interruptores de configuração do Administrador Geral
  const handleToggleAdminConfig = (key: keyof ConfiguracaoSistema) => {
    const atual = !!configSistema[key];
    const novaConfig = { ...configSistema, [key]: !atual };
    dbService.salvarConfiguracaoSistema(novaConfig);
    setConfigSistema(novaConfig);
    notificar(`Parâmetro de sistema "${String(key)}" ${!atual ? 'ativado' : 'desativado'} com sucesso.`);
  };

  // Alternar interruptores de configuração da Escola (Diretor)
  const handleToggleEscolaConfig = (key: keyof Escola) => {
    const atual = !!escolaData[key];
    const novaEscola: Escola = { ...escolaData, [key]: !atual };
    dbService.salvarEscola(novaEscola);
    setEscolaData(novaEscola);
    if (onAtualizarEscola) onAtualizarEscola(novaEscola);
    notificar(`Configuração escolar "${String(key)}" ${!atual ? 'ativada' : 'desativada'} para ${escola.nomeOficial}.`);
  };

  // Exportar Excel
  const handleExportExcel = () => {
    dbService.exportarParaExcel();
  };

  // Importar Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dbService.importarDeExcel(file).then(sucesso => {
      if (sucesso) {
        alert('Dados importados com sucesso a partir da folha de cálculo Excel!');
        window.location.reload();
      } else {
        alert('Erro ao importar ficheiro Excel. Verifique a estrutura das colunas.');
      }
    });
  };

  // Salvar Configurações Gerais
  const handleSalvarConfigSistema = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.salvarConfiguracaoSistema(configSistema);
    notificar('Configurações globais do sistema gravadas com sucesso.');
  };

  const logsFiltrados = logs.filter(l => {
    if (filtroAcao === 'TODAS') return true;
    if (filtroAcao === 'APOIO_TECNICO') {
      return (
        l.detalhe?.includes('[APOIO TÉCNICO AUTORIZADO') || 
        l.papel?.includes('Apoio Técnico') ||
        l.acao?.toLowerCase().includes('apoio') ||
        l.acao?.toLowerCase().includes('suporte')
      );
    }
    return (
      l.acao.toLowerCase().includes(filtroAcao.toLowerCase()) || 
      (l.detalhe && l.detalhe.toLowerCase().includes(filtroAcao.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header com Contexto */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
            <span>
              {isAdminGeral ? 'Administração Central do Sistema' : 'Direcção Geral Escolar'} • {escola.nomeOficial}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Cópias de Segurança, Configurações & Auditoria
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Gestão de snapshots de dados, restauração de segurança, parametrização da insígnia nacional para documentos oficiais, logotipo escolar e trilha de auditoria MED.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleSincronizarNuvem}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <Cloud className="h-4 w-4" />
            <span>Sincronizar Nuvem</span>
          </button>
        </div>
      </div>

      {/* Sub-Aba Navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 bg-gray-50/80 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('backup_restauracao')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'backup_restauracao' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Backup & Restauração</span>
        </button>

        <button
          onClick={() => setActiveTab('interruptores_configuracao')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'interruptores_configuracao' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Interruptores & Chaves do Sistema</span>
        </button>

        {isAdminGeral && (
          <button
            onClick={() => setActiveTab('configuracoes_globais')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'configuracoes_globais' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Insígnia Nacional & Parâmetros</span>
          </button>
        )}

        {isDiretorGeral && (
          <button
            onClick={() => setActiveTab('logotipo_escola')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'logotipo_escola' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Logotipo da Escola (Passes & Boletins)</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('dizeres_documentos')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'dizeres_documentos' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Dizeres & Disposição de Documentos</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'auditoria' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Trilha de Auditoria ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usuarios_perfis')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'usuarios_perfis' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCog className="h-4 w-4" />
          <span>Usuários e Perfis RBAC</span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'excel' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Folhas Excel (.xlsx)</span>
        </button>

        <button
          onClick={() => setActiveTab('formulas_notas')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'formulas_notas' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>Editor de Fórmulas de Notas</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* ABA 1: BACKUP E RESTAURAÇÃO DE DADOS       */}
      {/* ========================================== */}
      {activeTab === 'backup_restauracao' && (
        <div className="space-y-6">
          {/* Status do Armazenamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
                <HardDrive className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Armazenamento Offline</span>
                <p className="text-base font-black text-gray-900">IndexedDB + LocalStorage</p>
                <span className="text-[11px] text-emerald-700 font-bold">100% Operacional</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Sincronização em Nuvem</span>
                <p className="text-base font-black text-gray-900">Firebase Firestore</p>
                <span className="text-[11px] text-indigo-700 font-bold">
                  {configSistema.ultimaSincronizacao ? new Date(configSistema.ultimaSincronizacao).toLocaleDateString('pt-AO') : 'Ativa'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Modo de Operação</span>
                <p className="text-base font-black text-gray-900">
                  {configSistema.modoProducao ? 'Produção Oficial' : 'Demonstração'}
                </p>
                <span className="text-[11px] text-gray-500 font-medium">MED Angola</span>
              </div>
            </div>
          </div>

          {/* Cartões de Ação de Backup & Restauração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Criar Backup */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center space-x-3 text-blue-700">
                <Download className="h-6 w-6" />
                <h3 className="text-base font-bold text-gray-900">Gerar Cópia de Segurança Completa</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Exporta um arquivo snapshot seguro em formato <strong>.JSON</strong> contendo a totalidade dos dados da instituição:
                escolas, estudantes, turmas, notas consolidadas, lançamentos da MAC, transações financeiras, despesas e património.
              </p>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-bold">Conteúdo do Arquivo:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>{alunos.length} Estudantes com dados biográficos e notas</li>
                  <li>{funcionarios.length} Funcionários e respetivas credenciais</li>
                  <li>Registo patrimonial e livros de caixa</li>
                </ul>
              </div>
              <button
                onClick={handleExportBackup}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Descarregar Snapshot JSON (.json)</span>
              </button>
            </div>

            {/* Restaurar Backup */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center space-x-3 text-emerald-700">
                <Upload className="h-6 w-6" />
                <h3 className="text-base font-bold text-gray-900">Restaurar Cópia de Segurança</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Restaura o estado completo da base de dados a partir de um arquivo gerado anteriormente.
                Útil para recuperação de desastres, transferências de servidor ou encerramento do ano letivo.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                  <span className="font-bold">Aviso Importante:</span>
                </div>
                <p className="text-[11px] mt-1">
                  A restauração substituirá os registos atuais pelos dados contidos no ficheiro. Garanta que o ficheiro pertence à sua instituição.
                </p>
              </div>

              <label className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-600 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Selecionar Ficheiro de Backup (.json) no Dispositivo</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA: INTERRUPTORES & CHAVES DE ATIVAÇÃO / DESATIVAÇÃO    */}
      {/* ======================================================== */}
      {activeTab === 'interruptores_configuracao' && (
        <div className="space-y-6">
          {/* 1. INTERRUPTORES DO ADMINISTRADOR GERAL (MED ANGOLA) */}
          {isAdminGeral && (
            <div className="bg-white rounded-2xl border-2 border-blue-600 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-6 w-6 text-blue-700" />
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      Chaves de Controlo do Sistema (Administrador Geral)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Parâmetros ministeriais que afetam todas as instituições da rede de ensino.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 self-start sm:self-center">
                  Gabinete Ministerial
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. Modo Produção */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Modo de Produção Oficial</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        configSistema.modoProducao ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {configSistema.modoProducao ? 'Ativo' : 'Demonstração'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Quando ativado, os dados são considerados oficiais do Ministério da Educação e sujeitos a auditoria estrita.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAdminConfig('modoProducao')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.modoProducao ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configSistema.modoProducao ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Sincronização em Nuvem Firebase */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Sincronização em Nuvem em Tempo Real</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        configSistema.sincronizacaoFirebaseAtiva ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {configSistema.sincronizacaoFirebaseAtiva ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Sincroniza automaticamente alterações locais com a nuvem central do MED.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAdminConfig('sincronizacaoFirebaseAtiva')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.sincronizacaoFirebaseAtiva ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configSistema.sincronizacaoFirebaseAtiva ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Auditoria Forense Rigorosa */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Auditoria Forense Rigorosa (NIST SP 800-63B)</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        configSistema.modoAuditoriaForense !== false ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {configSistema.modoAuditoriaForense !== false ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Registo imutável de todas as consultas, alterações de notas e acessos sensíveis no diário criptográfico.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAdminConfig('modoAuditoriaForense')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.modoAuditoriaForense !== false ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configSistema.modoAuditoriaForense !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Bloqueio Preventivo por 3 Falhas */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Bloqueio Automático por Tentativas Falhadas</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        configSistema.bloqueioPorFalhasLogin !== false ? 'bg-rose-100 text-rose-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {configSistema.bloqueioPorFalhasLogin !== false ? 'Regra 3 Tentativas' : 'Desativado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Suspende temporariamente o login de utilizadores que errem a palavra-passe 3 vezes consecutivas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAdminConfig('bloqueioPorFalhasLogin')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.bloqueioPorFalhasLogin !== false ? 'bg-rose-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configSistema.bloqueioPorFalhasLogin !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Validação Algorítmica de BI */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Validação Algorítmica de BI Angolano</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        configSistema.validarBIComAlgoritmoNacional ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {configSistema.validarBIComAlgoritmoNacional ? 'Rigoroso' : 'Flexível'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Valida se o formato (9 dígitos + 2 letras + 3 dígitos) e código da província correspondem à DNI de Angola.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAdminConfig('validarBIComAlgoritmoNacional')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.validarBIComAlgoritmoNacional ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configSistema.validarBIComAlgoritmoNacional ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 6. Criação de Novas Escolas */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Adesão & Criação de Novas Escolas</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        configSistema.permitirAutoRegistoEscolas !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {configSistema.permitirAutoRegistoEscolas !== false ? 'Permitido' : 'Bloqueado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Permite cadastrar novas instituições públicas ou público-privadas na rede nacional do sistema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAdminConfig('permitirAutoRegistoEscolas')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.permitirAutoRegistoEscolas !== false ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        configSistema.permitirAutoRegistoEscolas !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. INTERRUPTORES DO DIRETOR GERAL DA ESCOLA */}
          {isDiretorGeral && (
            <div className="bg-white rounded-2xl border-2 border-emerald-600 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Building2 className="h-6 w-6 text-emerald-700" />
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      Chaves de Controlo da Escola ({escola.nomeOficial})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Interruptores de autonomia do Diretor Geral para gestão académica, notas, passes e secretaria.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-center">
                  Gabinete da Direção
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. Matrículas e Confirmações Abertas */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Período de Matrículas & Confirmações</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.matriculasAbertas !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {escolaData.matriculasAbertas !== false ? 'Aberto' : 'Encerrado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Permite que a Secretaria Escolar inscreva novos alunos ou confirme matrículas do ano lectivo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('matriculasAbertas')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.matriculasAbertas !== false ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.matriculasAbertas !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Janela de Lançamento de Notas Aberta */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Janela de Lançamento de Notas (Professores)</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.lancamentoNotasAberto !== false ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {escolaData.lancamentoNotasAberto !== false ? 'Desbloqueado' : 'Pautas Bloqueadas'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Quando bloqueado, os professores não podem mais alterar as notas do trimestre sem autorização expressa da Direção.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('lancamentoNotasAberto')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.lancamentoNotasAberto !== false ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.lancamentoNotasAberto !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Solicitação de Alteração de Nota */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Pedidos de Retificação de Nota pelos Docentes</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.permitirSolicitacaoAlteracaoNota !== false ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {escolaData.permitirSolicitacaoAlteracaoNota !== false ? 'Permitido' : 'Suspenso'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Habilita o formulário de pedido formal de retificação de notas para apreciação e despacho da Direção.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('permitirSolicitacaoAlteracaoNota')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.permitirSolicitacaoAlteracaoNota !== false ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.permitirSolicitacaoAlteracaoNota !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Exigir Quitação de Propinas para Certificados */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Exigir Regularização de Propinas para Documentos</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.exigirPropinaRegularizadaParaDocumentos ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {escolaData.exigirPropinaRegularizadaParaDocumentos ? 'Exigido' : 'Isento'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Bloqueia a impressão de declarações com notas e certificados caso o aluno possua propinas pendentes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('exigirPropinaRegularizadaParaDocumentos')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.exigirPropinaRegularizadaParaDocumentos ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.exigirPropinaRegularizadaParaDocumentos ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Emissão de Passes Escolares com QR Code */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Emissão de Passes Escolares com QR Code</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.emissaoPassesAtiva !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {escolaData.emissaoPassesAtiva !== false ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Habilita o módulo de passes e a inclusão do código QR para validação de autenticidade no portão da instituição.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('emissaoPassesAtiva')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.emissaoPassesAtiva !== false ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.emissaoPassesAtiva !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 6. Módulo Financeiro & Caixa */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Módulo Financeiro & Cobrança de Propinas</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.moduloFinanceiroAtivo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {escolaData.moduloFinanceiroAtivo !== false ? 'Ativo' : 'Desativado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Ativa a emissão de recibos e controlo financeiro pelo Subdirector Administrativo e Secretaria.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('moduloFinanceiroAtivo')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.moduloFinanceiroAtivo !== false ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.moduloFinanceiroAtivo !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 7. Prova do Professor (NPP) no Cálculo da Média Trimestral */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Prova do Professor (NPP) no Cálculo da MT</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.nppAtivo !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {escolaData.nppAtivo !== false ? 'MT=(MAC+NPP+NPT)/3' : 'MT=(MAC+NPT)/2'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Define a fórmula oficial de ponderação trimestral para as pautas e boletins da instituição.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleEscolaConfig('nppAtivo')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.nppAtivo !== false ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.nppAtivo !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 8. Layout Oficial de Impressão dos Boletins */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-gray-900">Formato Padrão de Boletins de Notas</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        escolaData.layoutBoletinsPadrao === '1_por_folha' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {escolaData.layoutBoletinsPadrao === '1_por_folha' ? '1 por Folha A4' : '4 por Folha A4 Económico'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Configura a grelha de impressão dos boletins oficiais (4 por folha reduz custos de papel e impressão).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const novo: '1_por_folha' | '4_por_folha' = escolaData.layoutBoletinsPadrao === '1_por_folha' ? '4_por_folha' : '1_por_folha';
                      const at: Escola = { ...escolaData, layoutBoletinsPadrao: novo };
                      dbService.salvarEscola(at);
                      setEscolaData(at);
                      if (onAtualizarEscola) onAtualizarEscola(at);
                      notificar(`Formato de boletins definido para: ${novo === '1_por_folha' ? '1 por folha' : '4 por folha'}.`);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      escolaData.layoutBoletinsPadrao !== '1_por_folha' ? 'bg-emerald-600' : 'bg-indigo-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        escolaData.layoutBoletinsPadrao !== '1_por_folha' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: INSÍGNIA NACIONAL & PARÂMETROS (ADMIN GERAL)      */}
      {/* ======================================================== */}
      {activeTab === 'configuracoes_globais' && isAdminGeral && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Insígnia da República de Angola & Identidade Documental
            </h3>
            <p className="text-xs text-gray-500">
              Conforme as diretrizes oficiais do Ministério da Educação, o Administrador Geral pode definir a insígnia que encabeçará todos os documentos emitidos (certificados, pautas, declarações e boletins) antes e acima da frase centralizada "REPÚBLICA DE ANGOLA".
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Preview Documental da Insígnia */}
            <div className="md:col-span-5 bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Pré-visualização nos Documentos Oficiais
              </span>

              {/* Insígnia Centralizada */}
              <div className="flex justify-center my-2">
                {insigniaPreview ? (
                  <img
                    src={insigniaPreview}
                    alt="Insígnia da República de Angola"
                    className="h-20 w-20 object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <InsigniaAngola size={72} />
                )}
              </div>

              {/* Texto Oficial Centralizado abaixo da insígnia */}
              <div className="space-y-0.5 border-t border-slate-200 pt-3">
                <p className="text-sm font-black uppercase tracking-widest text-slate-900">
                  REPÚBLICA DE ANGOLA
                </p>
                <p className="text-xs font-bold uppercase text-slate-600">
                  MINISTÉRIO DA EDUCAÇÃO
                </p>
                <p className="text-xs font-semibold text-slate-800">
                  {escola.nomeOficial}
                </p>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Esta formatação é renderizada automaticamente em todos os certificados, declarações e termos de exame.
              </p>
            </div>

            {/* Controlo de Seleção da Insígnia */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                  <span>Carregar Insígnia do Dispositivo</span>
                </h4>
                <p className="text-xs text-blue-800">
                  Selecione uma imagem da insígnia no formato PNG com transparência, SVG ou JPG no seu computador ou telemóvel.
                </p>
                <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                  <Upload className="h-4 w-4" />
                  <span>Selecionar Imagem no Dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleInsigniaUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestaurarInsigniaPadrao}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Restaurar Insígnia Vetorial Padrão
                </button>
              </div>

              {/* Outros Parâmetros Gerais */}
              <form onSubmit={handleSalvarConfigSistema} className="pt-4 border-t border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Parâmetros de Identificação do Sistema
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Sistema</label>
                    <input
                      type="text"
                      value={configSistema.nomeSistema}
                      onChange={(e) => setConfigSistema({ ...configSistema, nomeSistema: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ministério / Órgão</label>
                    <input
                      type="text"
                      value={configSistema.ministerioNome}
                      onChange={(e) => setConfigSistema({ ...configSistema, ministerioNome: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                  >
                    Guardar Configurações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: LOGOTIPO DA ESCOLA (DIRETOR GERAL)                */}
      {/* ======================================================== */}
      {activeTab === 'logotipo_escola' && isDiretorGeral && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Logotipo da Escola ({escola.nomeOficial})
            </h3>
            <p className="text-xs text-gray-500">
              Conforme as orientações do MED, cada diretor pode adicionar o logotipo da sua escola, que será exibido <strong>apenas nos passes dos estudantes e nos boletins de notas</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Visualização no Passe e Boletim */}
            <div className="md:col-span-5 bg-slate-50 border-2 border-indigo-200 rounded-2xl p-6 text-center space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                Aparência nos Cartões de Estudante & Boletins
              </span>

              <div className="flex justify-center">
                {logotipoPreview ? (
                  <img
                    src={logotipoPreview}
                    alt={`Logotipo da ${escola.nomeOficial}`}
                    className="h-24 w-24 object-contain rounded-xl border border-gray-300 p-1 bg-white shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-white">
                    <Building2 className="h-8 w-8 text-gray-300" />
                    <span className="text-[9px] mt-1 font-bold">Sem Logotipo</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-gray-900">{escola.nomeOficial}</p>
                <p className="text-[11px] text-gray-500">Sigla: {escola.sigla || 'ESC'}</p>
                <p className="text-[10px] text-indigo-600 font-semibold">Exibição: Passe do Aluno • Boletim de Notas</p>
              </div>
            </div>

            {/* Ação de Upload */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                  <Upload className="h-4 w-4 text-indigo-600" />
                  <span>Carregar Logotipo Escolar do Dispositivo</span>
                </h4>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Selecione o ficheiro do brasão ou logotipo oficial da sua instituição de ensino a partir do seu dispositivo (formato PNG, JPG ou SVG).
                </p>

                <label className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                  <Upload className="h-4 w-4" />
                  <span>Selecionar Logotipo no Dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogotipoEscolaUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Nota Institucional:</strong> Os certificados de conclusão e declarações legais mantêm sempre a Insígnia Nacional da República de Angola como cabeçalho de soberania do Estado angolano.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: TRILHA DE AUDITORIA IMUTÁVEL        */}
      {/* ========================================== */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Registo Imutável de Auditoria (Logs do Sistema)</h3>
              <p className="text-xs text-gray-500">Rastreabilidade forense de todas as operações administrativas e letivas</p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filtroAcao}
                onChange={(e) => setFiltroAcao(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-600"
              >
                <option value="TODAS">Todas as Ações</option>
                <option value="APOIO_TECNICO">Ações do Admin Geral (Apoio Técnico)</option>
                <option value="Autenticação">Autenticação</option>
                <option value="Aluno">Gestão de Alunos</option>
                <option value="Nota">Lançamento de Notas</option>
                <option value="Backup">Backups</option>
                <option value="Financeiro">Financeiro</option>
              </select>

              {isAdminGeral && (
                <button
                  onClick={onLimparLogs}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpar Logs</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-gray-200 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Utilizador / Papel</th>
                  <th className="py-3 px-3">Ação</th>
                  <th className="py-3 px-3">Detalhes</th>
                  <th className="py-3 px-3 font-mono">Endereço IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-gray-600 whitespace-nowrap">
                      {log.dataHora}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{log.utilizadorNome}</div>
                      <span className="text-[10px] text-blue-700 font-semibold">{log.papel}</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {log.acao}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 max-w-md">
                      {log.detalhe?.includes('[APOIO TÉCNICO AUTORIZADO') && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 mr-1.5 mb-1">
                          Apoio Técnico DTI
                        </span>
                      )}
                      <span>{log.detalhe}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-500 text-[11px]">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA: USUÁRIOS, PERFIS & CONTROLO DE ACESSO RBAC         */}
      {/* ======================================================== */}
      {activeTab === 'usuarios_perfis' && (
        <div className="space-y-6">
          {/* Header & Ações */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-blue-700">
                <UserCog className="h-6 w-6" />
                <h3 className="text-base font-black text-gray-900">
                  Gestão de Utilizadores, Credenciais & Controlo de Acesso (RBAC)
                </h3>
              </div>
              <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
                Administração centralizada de credenciais de login, suspensão preventiva de contas, redefinição de palavras-passe e auditoria de papéis oficiais no SGE-NG.
              </p>
            </div>

            <button
              onClick={() => setShowNovoUsuarioModal(true)}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Nova Conta</span>
            </button>
          </div>

          {/* Cartões Estatísticos de Utilizadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total de Contas</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{listaUsuarios.length}</p>
              <span className="text-[11px] text-gray-500">Na base de dados oficial</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Contas Ativas</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {listaUsuarios.filter(u => u.statusConta !== 'Suspensa').length}
              </p>
              <span className="text-[11px] text-emerald-700 font-bold">Com acesso normal autorizado</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Contas Suspensas</span>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {listaUsuarios.filter(u => u.statusConta === 'Suspensa').length}
              </p>
              <span className="text-[11px] text-rose-700 font-bold">Acesso bloqueado</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Direção & Coordenação</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {listaUsuarios.filter(u => ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdirectorAdministrativo', 'CoordenadorPedagogico'].includes(u.role)).length}
              </p>
              <span className="text-[11px] text-indigo-700 font-bold">Nível executivo</span>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, BI, email ou cargo..."
                  value={buscaUsuario}
                  onChange={(e) => setBuscaUsuario(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <select
                value={filtroRoleUsuario}
                onChange={(e) => setFiltroRoleUsuario(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
              >
                <option value="TODOS">Todos os Perfis (RBAC)</option>
                <option value="AdminGeral">Administrador Geral</option>
                <option value="DiretorGeral">Diretor Geral</option>
                <option value="SubdiretorPedagogico">Subdiretor Pedagógico</option>
                <option value="SubdirectorAdministrativo">Subdirector Administrativo</option>
                <option value="CoordenadorPedagogico">Coordenador Pedagógico</option>
                <option value="CoordenadorTurno">Coordenador de Turno</option>
                <option value="Professor">Professor</option>
                <option value="Secretaria">Secretaria</option>
                <option value="ChefeSecretaria">Chefe de Secretaria</option>
                <option value="Encarregado">Encarregado</option>
              </select>

              <select
                value={filtroStatusUsuario}
                onChange={(e) => setFiltroStatusUsuario(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
              >
                <option value="TODOS">Todos os Estados</option>
                <option value="Ativa">Contas Ativas</option>
                <option value="Suspensa">Contas Suspensas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Utilizadores */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Utilizador / Identificação</th>
                    <th className="py-3 px-4">Contactos</th>
                    <th className="py-3 px-4">Cargo / Função</th>
                    <th className="py-3 px-4">Perfil RBAC</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações de Segurança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listaUsuarios
                    .filter(u => {
                      const termo = buscaUsuario.toLowerCase();
                      const matchBusca = u.nomeCompleto.toLowerCase().includes(termo) ||
                        (u.email || '').toLowerCase().includes(termo) ||
                        (u.numeroBI || '').toLowerCase().includes(termo) ||
                        (u.cargo || '').toLowerCase().includes(termo);
                      const matchRole = filtroRoleUsuario === 'TODOS' || u.role === filtroRoleUsuario;
                      const matchStatus = filtroStatusUsuario === 'TODOS' || 
                        (filtroStatusUsuario === 'Ativa' ? u.statusConta !== 'Suspensa' : u.statusConta === 'Suspensa');
                      return matchBusca && matchRole && matchStatus;
                    })
                    .map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {usuario.nomeCompleto.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 block">{usuario.nomeCompleto}</span>
                              <span className="text-[11px] text-gray-500 font-mono">{usuario.numeroBI || 'Sem BI'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-600">
                          <div>{usuario.email}</div>
                          <span className="text-[11px] text-gray-500">{usuario.telefone}</span>
                        </td>

                        <td className="py-3 px-4 text-gray-800 font-medium">
                          {usuario.cargo}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            usuario.role === 'AdminGeral' ? 'bg-purple-100 text-purple-900' :
                            usuario.role === 'DiretorGeral' ? 'bg-blue-100 text-blue-900' :
                            usuario.role === 'SubdiretorPedagogico' || usuario.role === 'CoordenadorPedagogico' ? 'bg-indigo-100 text-indigo-900' :
                            usuario.role === 'Professor' ? 'bg-amber-100 text-amber-900' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {usuario.role}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleAlternarStatusUsuario(usuario)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                              usuario.statusConta === 'Suspensa'
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            }`}
                          >
                            {usuario.statusConta === 'Suspensa' ? 'Suspensa' : 'Ativa'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setUsuarioParaRedefinir(usuario);
                                setNovaSenhaInput('');
                              }}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                              title="Redefinir Senha de Acesso"
                            >
                              <Key className="h-3 w-3 text-amber-600" />
                              <span>Senha</span>
                            </button>

                            <button
                              onClick={() => handleAlternarStatusUsuario(usuario)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                usuario.statusConta === 'Suspensa'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                              title={usuario.statusConta === 'Suspensa' ? 'Reativar Conta' : 'Suspender Acesso'}
                            >
                              {usuario.statusConta === 'Suspensa' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Matriz Interativa de Permissões RBAC (Padrão MED) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center space-x-2 text-slate-800">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h4 className="text-sm font-black text-gray-900">
                Matriz de Permissões e Controlo de Acesso Baseado em Papéis (RBAC - MED Angola)
              </h4>
            </div>
            <p className="text-xs text-gray-500">
              Mapeamento regulamentar das prerrogativas concedidas a cada função no Sistema de Gestão Escolar:
            </p>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Módulo / Função</th>
                    <th className="py-2.5 px-3 text-center">Admin Geral</th>
                    <th className="py-2.5 px-3 text-center">Diretor Geral</th>
                    <th className="py-2.5 px-3 text-center">Sub. Pedagógico</th>
                    <th className="py-2.5 px-3 text-center">Sub. Administ.</th>
                    <th className="py-2.5 px-3 text-center">Professor</th>
                    <th className="py-2.5 px-3 text-center">Secretaria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Gestão de Turmas e Disciplinas</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Total</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Total</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Total</td>
                    <td className="py-2 px-3 text-center text-gray-400">Consulta</td>
                    <td className="py-2 px-3 text-center text-gray-400">Atribuídas</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Edição</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Lançamento de Notas MAC / Trimestres</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Auditoria</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Homologação</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Homologação</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Lançamento</td>
                    <td className="py-2 px-3 text-center text-gray-400">Consulta</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Comissões de Júri & Deliberações</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Supervisão</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Presidente</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Vogal/Coord.</td>
                    <td className="py-2 px-3 text-center text-gray-400">Membro</td>
                    <td className="py-2 px-3 text-center text-blue-600 font-bold">Membro Júri</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Apoio/Secret.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Pautas, Boletins e Certificados</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Total</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Assinatura</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Visto</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Visto</td>
                    <td className="py-2 px-3 text-center text-blue-600 font-bold">Pautas Turma</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Emissão</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Livro de Ponto & Assiduidade Docente</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Auditoria</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Assinatura</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Assinatura</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Assinatura</td>
                    <td className="py-2 px-3 text-center text-gray-400">Consulta</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Caixa, Propinas & Gestão Financeira</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Auditoria</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Supervisão</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Gestão Caixa</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Recebimento</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-gray-900">Segurança, Backups & Auditoria Forense</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Total</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-bold">Escola</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL REDEFINIR SENHA */}
          {usuarioParaRedefinir && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Redefinir Palavra-Passe</h3>
                      <p className="text-xs text-gray-500">{usuarioParaRedefinir.nomeCompleto}</p>
                    </div>
                  </div>
                  <button onClick={() => setUsuarioParaRedefinir(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSalvarRedefinicaoSenha} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nova Palavra-Passe *</label>
                    <input
                      type="text"
                      required
                      placeholder="Introduza a nova palavra-passe"
                      value={novaSenhaInput}
                      onChange={(e) => setNovaSenhaInput(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const aleatoria = `Educa@${Math.floor(1000 + Math.random() * 9000)}!`;
                        setNovaSenhaInput(aleatoria);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Gerar Senha Segura
                    </button>
                    <span className="text-[11px] text-gray-500">Mínimo 6 caracteres</span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                    A alteração é imediata e será averbada no livro de auditoria forense com o carimbo do operador atual.
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setUsuarioParaRedefinir(null)}
                      className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center space-x-1 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Atualizar Senha</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL CADASTRAR NOVO UTILIZADOR */}
          {showNovoUsuarioModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Cadastrar Nova Conta de Acesso</h3>
                      <p className="text-xs text-gray-500">Credenciais e atribuição de papel RBAC</p>
                    </div>
                  </div>
                  <button onClick={() => setShowNovoUsuarioModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCriarNovoUsuario} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Baptista da Silva"
                      value={novoUserNome}
                      onChange={(e) => setNovoUserNome(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Número do BI *</label>
                      <input
                        type="text"
                        required
                        placeholder="001928374LA049"
                        value={novoUserBI}
                        onChange={(e) => setNovoUserBI(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={novoUserTelefone}
                        onChange={(e) => setNovoUserTelefone(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Correio Eletrónico (Email de Login) *</label>
                    <input
                      type="email"
                      required
                      placeholder="utilizador@escola.gov.ao"
                      value={novoUserEmail}
                      onChange={(e) => setNovoUserEmail(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Perfil de Acesso (RBAC) *</label>
                      <select
                        value={novoUserRole}
                        onChange={(e) => {
                          const r = e.target.value as UserRole;
                          setNovoUserRole(r);
                          setNovoUserCargo(
                            r === 'Professor' ? 'Professor' :
                            r === 'DiretorGeral' ? 'Diretor Geral' :
                            r === 'SubdiretorPedagogico' ? 'Subdiretor Pedagógico' :
                            r === 'SubdirectorAdministrativo' ? 'Subdirector Administrativo' :
                            r === 'CoordenadorPedagogico' ? 'Coordenador Pedagógico' :
                            r === 'CoordenadorTurno' ? 'Coordenador de Turno' :
                            r === 'Secretaria' ? 'Técnico de Secretaria' :
                            r === 'ChefeSecretaria' ? 'Chefe de Secretaria' : 'Encarregado'
                          );
                        }}
                        className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-bold"
                      >
                        <option value="Professor">Professor</option>
                        <option value="Secretaria">Secretaria</option>
                        <option value="ChefeSecretaria">Chefe de Secretaria</option>
                        <option value="CoordenadorPedagogico">Coordenador Pedagógico</option>
                        <option value="CoordenadorTurno">Coordenador de Turno</option>
                        <option value="SubdiretorPedagogico">Subdiretor Pedagógico</option>
                        <option value="SubdirectorAdministrativo">Subdirector Administrativo</option>
                        <option value="DiretorGeral">Diretor Geral</option>
                        {isAdminGeral && <option value="AdminGeral">Administrador Geral</option>}
                        <option value="Encarregado">Encarregado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Cargo Oficial</label>
                      <input
                        type="text"
                        value={novoUserCargo}
                        onChange={(e) => setNovoUserCargo(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Palavra-Passe Inicial *</label>
                    <input
                      type="text"
                      required
                      value={novoUserSenha}
                      onChange={(e) => setNovoUserSenha(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowNovoUsuarioModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Criar Conta Oficial</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 5: IMPORTAÇÃO E EXPORTAÇÃO EXCEL       */}
      {/* ========================================== */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-2xl flex items-start space-x-3">
            <FileSpreadsheet className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Sincronização em Massa com Folhas de Cálculo Excel (.xlsx)
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Exporte ou importe listas completas de estudantes, turmas e professores para integração com administrações municipais de educação.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Download className="h-5 w-5 text-emerald-600" />
                <span>Exportar Dados da Escola (.xlsx)</span>
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Gera um livro Excel completo contendo tabelas de estudantes, turmas e professores com os respetivos identificadores MED.
              </p>
              <button
                onClick={handleExportExcel}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Descarregar Livro Excel Completo</span>
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <span>Importar Lista Excel (.xlsx)</span>
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Carregue listas de estudantes fornecidas por outras instituições com mapeamento automático de colunas e turmas.
              </p>
              <label className="w-full py-3 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-600 text-blue-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Selecionar Folha Excel (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: DIZERES E DISPOSIÇÃO OFICIAL DE TODOS OS DOCUMENTOS (COM PREVIEW)    */}
      {/* ========================================================================= */}
      {activeTab === 'dizeres_documentos' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Banner Informativo */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  Prerrogativa da Direção & Administração
                </span>
                <span className="text-xs text-blue-200 font-semibold">{escola.nomeOficial}</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                Dizeres, Fórmulas Legais & Disposição de Documentos
              </h3>
              <p className="text-xs text-blue-200/90 mt-1 max-w-2xl leading-relaxed">
                Personalize os textos de abertura, dizeres legais, fórmulas de encerramento, rodapés e a disposição das assinaturas e carimbos para cada modelo documental emitido pela instituição. Cada documento possui pré-visualização ao vivo em tempo real.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDocConfigSelecionado('pauta_trimestral');
                setModalConfigDocOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-300" />
              <span>Abrir Configurador Geral</span>
            </button>
          </div>

          {/* Grid de Modelos Oficiais de Documentos com Pré-visualização */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 'pauta_trimestral',
                titulo: 'Pauta Trimestral Oficial',
                categoria: 'Avaliação & Rendimento',
                orientacao: 'A4 Paisagem (Horizontal)',
                descricao: 'Pauta consolidada com disciplinas estritas da classe, médias trimestrais, MAC, NPP, NPT e validação estatística.',
                assinaturas: 'Diretor Geral, Subdiretor Pedagógico e Coordenador',
                badge: 'MED Angola'
              },
              {
                id: 'boletim_oficial',
                titulo: 'Boletim de Notas Trimestrais',
                categoria: 'Comunicação com Encarregados',
                orientacao: 'A4 Retrato (Vertical)',
                descricao: 'Boletim individual com aproveitamento por disciplina, assiduidade, comportamento e observações pedagógicas.',
                assinaturas: 'Diretor Geral, Professor Titular e Encarregado',
                badge: 'Oficial'
              },
              {
                id: 'certificado',
                titulo: 'Certificado de Habilitações Literárias',
                categoria: 'Certificação de Nível',
                orientacao: 'A4 Retrato com Marca D\'Água',
                descricao: 'Documento solene para 6ª, 9ª, 12ª e 13ª classes com averbamento ministerial e notas por extenso.',
                assinaturas: 'Diretor Geral e Chefe da Secretaria',
                badge: 'Soberania MED'
              },
              {
                id: 'declaracao_notas',
                titulo: 'Declaração com Notas',
                categoria: 'Certidão Provisória',
                orientacao: 'A4 Retrato (Vertical)',
                descricao: 'Declaração provisória de aproveitamento para fins de matrícula ou transferência interprovincial.',
                assinaturas: 'Diretor Geral e Secretário Pedagógico',
                badge: 'Com Notas'
              },
              {
                id: 'declaracao_matricula',
                titulo: 'Declaração de Matrícula Efectiva',
                categoria: 'Comprovativo de Frequência',
                orientacao: 'A4 Retrato (Vertical)',
                descricao: 'Atestado de frequência regular do educando para apresentação em serviços consulares ou laborais.',
                assinaturas: 'Diretor Geral e Secretaria Escolar',
                badge: 'Sem Efeito de Notas'
              },
              {
                id: 'cartao_estudante',
                titulo: 'Cartão / Passe de Estudante',
                categoria: 'Identificação Escolar',
                orientacao: 'Formato ID Card (Frente e Verso)',
                descricao: 'Passe estudantil com fotografia, código QR de segurança forense, número de processo e validade anual.',
                assinaturas: 'Assinatura Digitalizada do Diretor',
                badge: 'QR Code Dinâmico'
              },
              {
                id: 'termo_exame',
                titulo: 'Termo de Exame e Deliberação do Júri',
                categoria: 'Exames Finais de Nível',
                orientacao: 'A4 Paisagem (Horizontal)',
                descricao: 'Ata oficial de prova de exame com notas de frequência, exame escrito, deliberação final e assinaturas da comissão.',
                assinaturas: 'Presidente do Júri, Secretário e Vigilantes',
                badge: 'Júri Homologado'
              },
              {
                id: 'guia_transferencia',
                titulo: 'Guia de Transferência Escolar',
                categoria: 'Mobilidade Discente',
                orientacao: 'A4 Retrato (Vertical)',
                descricao: 'Guia oficial de desvinculação e transferência entre instituições com parecer da Direção Geral.',
                assinaturas: 'Diretor Geral e Diretor da Escola de Destino',
                badge: 'Tramitação MED'
              },
              {
                id: 'recibo_pagamento',
                titulo: 'Recibo de Pagamento de Propinas',
                categoria: 'Tesouraria & Finanças',
                orientacao: 'A4 Meia Folha / Retrato',
                descricao: 'Comprovativo de arrecadação financeira de propinas, taxas ou certificados com número sequencial e NIF.',
                assinaturas: 'Operador de Cobrança / Delegado Financeiro',
                badge: 'Auditoria Fiscal'
              }
            ].map(doc => {
              const configsAtuais = dbService.getConfiguracoesDocumentos(escola.id);
              const customizado = configsAtuais[doc.id];

              return (
                <div 
                  key={doc.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {doc.categoria}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {doc.orientacao}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-gray-900">
                        {doc.titulo}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {doc.descricao}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-[11px] space-y-1">
                      <p className="text-gray-500">
                        <strong>Assinaturas:</strong> {doc.assinaturas}
                      </p>
                      <div className="flex items-center space-x-2 pt-1">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          customizado 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{customizado ? 'Dizeres Personalizados' : 'Padrão Ministerial Activo'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDocConfigSelecionado(doc.id);
                        setModalConfigDocOpen(true);
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Configurar & Pré-visualizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: EDITOR DE FÓRMULAS DE CÁLCULO DE NOTAS (ADMINISTRADOR GERAL / DIREÇÃO) */}
      {/* ========================================================================= */}
      {activeTab === 'formulas_notas' && (
        <div className="space-y-6">
          {/* Banner de Cabeçalho do Editor */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-purple-500/30 border border-purple-400 text-purple-200 text-xs font-bold rounded-full flex items-center space-x-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Editor Oficial de Fórmulas & Pesos de Notas</span>
                </span>
                <span className="px-2.5 py-0.5 bg-indigo-950/80 border border-indigo-400/40 text-indigo-300 text-xs font-bold rounded-full font-mono">
                  Regras Versão v{regrasMAC.find(r => r.nivelEnsino === nivelFormulaSelecionado)?.versao || 1}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-full">
                  Escala: 0 a {escalaMaximaNivel} valores
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Parametrização Central das Fórmulas de Avaliação
              </h3>
              <p className="text-xs sm:text-sm text-purple-200/80 max-w-3xl leading-relaxed">
                Defina com precisão regulamentar os pesos específicos para MAC, Provas do Professor (NPP), Provas Trimestrais (NPT) e Média Final (MF) por nível de ensino. Diferencie os cálculos do 1º/2º trimestre e do 3º trimestre, bem como o tratamento de classes finais com exame vs. classes de transição.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestaurarPadraoMED}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-white/20 cursor-pointer"
                title="Repor parâmetros estritos do Ministério da Educação (MED Angola)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão MED</span>
              </button>
            </div>
          </div>

          {/* Seletor do Nível de Ensino */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { 
                id: 'Primario' as NivelEnsino, 
                label: 'Ensino Primário', 
                classes: '1ª à 6ª Classe', 
                escala: 'Escala 0 a 10 valores',
                aprovacao: 'Aprovação: ≥ 5.0'
              },
              { 
                id: 'ICiclo' as NivelEnsino, 
                label: 'Iº Ciclo Secundário', 
                classes: '7ª à 9ª Classe', 
                escala: 'Escala 0 a 20 valores',
                aprovacao: 'Aprovação: ≥ 10.0'
              },
              { 
                id: 'IICiclo' as NivelEnsino, 
                label: 'IIº Ciclo (Geral & Técnico)', 
                classes: '10ª à 13ª Classe', 
                escala: 'Escala 0 a 20 valores',
                aprovacao: 'Aprovação: ≥ 10.0'
              }
            ].map((nv) => {
              const selecionado = nivelFormulaSelecionado === nv.id;
              return (
                <button
                  key={`btn-nv-${nv.id}`}
                  type="button"
                  onClick={() => setNivelFormulaSelecionado(nv.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                    selecionado 
                      ? 'bg-purple-50/70 border-purple-600 shadow-md ring-2 ring-purple-500/20' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black uppercase tracking-wider ${selecionado ? 'text-purple-900' : 'text-gray-700'}`}>
                      {nv.label}
                    </span>
                    {selecionado && (
                      <span className="p-1 bg-purple-600 text-white rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-gray-900">{nv.classes}</div>
                  <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-1 font-mono">
                    <span>{nv.escala}</span>
                    <span>•</span>
                    <span className={selecionado ? 'text-purple-700 font-bold' : ''}>{nv.aprovacao}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSalvarRegrasFormulaOficial} className="space-y-6">
            {/* GRID PRINCIPAL: 1º e 2º Trimestre vs 3º Trimestre */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ========================================================= */}
              {/* BLOCO A: 1º e 2º TRIMESTRES (TRIMESTRES INICIAIS)         */}
              {/* ========================================================= */}
              <div className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center space-x-2 text-indigo-900">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide">1º e 2º Trimestres (Iniciais)</h4>
                      <p className="text-[11px] text-gray-500">Cálculo da Média Trimestral (MT1 e MT2)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded">
                    Trimestres 1 & 2
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Método de Cálculo da MT (1º e 2º Trimestres) *
                  </label>
                  <select
                    value={tipoCalc1e2}
                    onChange={(e) => setTipoCalc1e2(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="PONDERADA_PESOS">Ponderação por Pesos % (Padrão MED: MAC 40%, NPP 30%, NPT 30%)</option>
                    <option value="ARITMETICA_SIMPLES">Média Aritmética Simples: (MAC + NPP + NPT) / 3</option>
                    <option value="FORMULA_CUSTOMIZADA">Expressão Matemática Personalizada da Instituição</option>
                  </select>
                </div>

                {tipoCalc1e2 === 'PONDERADA_PESOS' && (
                  <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                      <span>Pesos Percentuais dos Componentes:</span>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        (pesoMac1e2 + pesoNpp1e2 + pesoNpt1e2 === 100)
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        Soma: {pesoMac1e2 + pesoNpp1e2 + pesoNpt1e2}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Peso MAC (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pesoMac1e2}
                          onChange={(e) => setPesoMac1e2(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Peso NPP / Prof (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pesoNpp1e2}
                          onChange={(e) => setPesoNpp1e2(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Peso NPT / Prova (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pesoNpt1e2}
                          onChange={(e) => setPesoNpt1e2(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {tipoCalc1e2 === 'FORMULA_CUSTOMIZADA' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Fórmula Expressa dos 1º e 2º Trimestres *
                    </label>
                    <input
                      type="text"
                      required
                      value={expressaoCustom1e2}
                      onChange={(e) => setExpressaoCustom1e2(e.target.value)}
                      placeholder="(MAC * 0.4) + (NPP * 0.3) + (NPT * 0.3)"
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-mono text-xs bg-white text-indigo-950 font-bold focus:ring-2 focus:ring-indigo-600"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Variáveis permitidas: <code>MAC</code>, <code>NPP</code>, <code>NPT</code>. Exemplo: <code>(MAC*0.4) + (NPP*0.3) + (NPT*0.3)</code>
                    </span>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600">
                  <strong>Padrão Regulamentar:</strong> A Prova do Professor (NPP) e a Prova Trimestral (NPT) ponderam-se juntamente à Média das Avaliações Contínuas (MAC).
                </div>
              </div>

              {/* ========================================================= */}
              {/* BLOCO B: 3º TRIMESTRE (DIFERENCIAÇÃO DE ENCERRAMENTO)     */}
              {/* ========================================================= */}
              <div className="bg-white p-5 rounded-2xl border-2 border-purple-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="flex items-center space-x-2 text-purple-900">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide">3º Trimestre (Diferenciação)</h4>
                      <p className="text-[11px] text-gray-500">Cálculo específico da Média do 3º Trimestre (MT3)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                    Encerramento
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-purple-950 block">
                      Diferenciar Regra do 3º Trimestre
                    </span>
                    <span className="text-[10px] text-purple-700">
                      Permite atribuir peso reforçado à Prova Final Trimestral ou fórmula especial
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diferenciar3Tri}
                      onChange={(e) => setDiferenciar3Tri(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {diferenciar3Tri ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Método de Cálculo da MT (3º Trimestre) *
                      </label>
                      <select
                        value={tipoCalc3}
                        onChange={(e) => setTipoCalc3(e.target.value as any)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="PONDERADA_PESOS">Ponderação com NPT Reforçada (MAC 30%, NPP 30%, NPT 40%)</option>
                        <option value="ARITMETICA_SIMPLES">Média Aritmética Simples: (MAC + NPP + NPT) / 3</option>
                        <option value="FORMULA_CUSTOMIZADA">Expressão Matemática Personalizada do 3º Trimestre</option>
                      </select>
                    </div>

                    {tipoCalc3 === 'PONDERADA_PESOS' && (
                      <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                          <span>Pesos Diferenciados do 3º Trimestre:</span>
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                            (pesoMac3 + pesoNpp3 + pesoNpt3 === 100)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            Soma: {pesoMac3 + pesoNpp3 + pesoNpt3}%
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-700 block mb-1">Peso MAC (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pesoMac3}
                              onChange={(e) => setPesoMac3(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-700 block mb-1">Peso NPP / Prof (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pesoNpp3}
                              onChange={(e) => setPesoNpp3(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-700 block mb-1">Peso NPT Final (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pesoNpt3}
                              onChange={(e) => setPesoNpt3(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white text-purple-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {tipoCalc3 === 'FORMULA_CUSTOMIZADA' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Fórmula Expressa do 3º Trimestre *
                        </label>
                        <input
                          type="text"
                          required
                          value={expressaoCustom3}
                          onChange={(e) => setExpressaoCustom3(e.target.value)}
                          placeholder="(MAC * 0.3) + (NPP * 0.3) + (NPT * 0.4)"
                          className="w-full p-2.5 border border-gray-300 rounded-xl font-mono text-xs bg-white text-purple-950 font-bold focus:ring-2 focus:ring-purple-600"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          Variáveis: <code>MAC</code>, <code>NPP</code>, <code>NPT</code>. Ex: <code>(MAC*0.3)+(NPP*0.3)+(NPT*0.4)</code>
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 text-center">
                    ℹ️ O 3º Trimestre utilizará as mesmas regras e pesos configurados para os 1º e 2º trimestres.
                  </div>
                )}
              </div>
            </div>

            {/* GRID MÉDIA FINAL: Classes Não Finais (Transição) vs Classes Finais com Exame */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ========================================================= */}
              {/* BLOCO C: CLASSES NÃO FINAIS (CLASSES DE TRANSIÇÃO - MF)   */}
              {/* ========================================================= */}
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center space-x-2 text-emerald-900">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide">Classes Não Finais (Transição)</h4>
                      <p className="text-[11px] text-gray-500">Média Final Anual (MF) sem prova de exame (ex: 7ª, 8ª, 10ª, 11ª)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                    Transição Anual
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Cálculo da Média Final nas Classes de Transição *
                  </label>
                  <select
                    value={tipoCalcNaoFinais}
                    onChange={(e) => setTipoCalcNaoFinais(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="ARITMETICA_SIMPLES">Média Aritmética Simples dos Trimestres: (MT1 + MT2 + MT3) / 3</option>
                    <option value="PONDERADA_PESOS">Média Ponderada com Peso Crescente nos Trimestres</option>
                    <option value="FORMULA_CUSTOMIZADA">Expressão Matemática Personalizada de Transição</option>
                  </select>
                </div>

                {tipoCalcNaoFinais === 'PONDERADA_PESOS' && (
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                      <span>Ponderação Percentual por Trimestre na MF:</span>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        (pesoMFT1 + pesoMFT2 + pesoMFT3 === 100)
                          ? 'bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        Soma: {pesoMFT1 + pesoMFT2 + pesoMFT3}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">1º Tri / MT1 (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pesoMFT1}
                          onChange={(e) => setPesoMFT1(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">2º Tri / MT2 (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pesoMFT2}
                          onChange={(e) => setPesoMFT2(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">3º Tri / MT3 (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pesoMFT3}
                          onChange={(e) => setPesoMFT3(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {tipoCalcNaoFinais === 'FORMULA_CUSTOMIZADA' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Expressão Matemática da Média Geral *
                    </label>
                    <input
                      type="text"
                      required
                      value={expressaoCustomNaoFinais}
                      onChange={(e) => setExpressaoCustomNaoFinais(e.target.value)}
                      placeholder="(MT1 + MT2 + MT3) / 3"
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-mono text-xs bg-white text-emerald-950 font-bold focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Variáveis permitidas: <code>MT1</code>, <code>MT2</code>, <code>MT3</code>. Ex: <code>(MT1*0.2) + (MT2*0.3) + (MT3*0.5)</code>
                    </span>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600">
                  <strong>Regra MED:</strong> Estudantes transitam de classe quando a MF é igual ou superior a {escalaMaximaNivel === 10 ? '5.0 valores' : '10.0 valores'} e não acumulam reprovações eliminatórias.
                </div>
              </div>

              {/* ========================================================= */}
              {/* BLOCO D: CLASSES FINAIS COM EXAME (MF COM EXAME NACIONAL) */}
              {/* ========================================================= */}
              <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center space-x-2 text-amber-900">
                    <Scale className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide">Classes Finais com Exame (MF)</h4>
                      <p className="text-[11px] text-gray-500">Ponderação da Frequência (MDF) com a Nota de Exame (NE)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                    Exame / Conclusão
                  </span>
                </div>

                {/* Seleção das Classes Finais */}
                <div>
                  <span className="block text-xs font-bold text-gray-700 mb-1.5">
                    Classes Consideradas Classes Finais de Exame neste Nível:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['6ª', '9ª', '12ª', '13ª'].map(cls => {
                      const marcada = classesFinaisSelecionadas.includes(cls);
                      return (
                        <label 
                          key={`cls-final-${cls}`}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 ${
                            marcada 
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs' 
                              : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={(e) => {
                              if (e.target.checked) setClassesFinaisSelecionadas([...classesFinaisSelecionadas, cls]);
                              else setClassesFinaisSelecionadas(classesFinaisSelecionadas.filter(c => c !== cls));
                            }}
                            className="sr-only"
                          />
                          <span>{cls} Classe</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Pesos MDF e NE */}
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>Ponderação entre Frequência e Exame (Padrão Oficial MED):</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold border border-amber-300">
                      Total: {pesoMDF + pesoNE}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-gray-700 block mb-1">
                        Peso Média Frequência / MDF (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pesoMDF}
                        onChange={(e) => setPesoMDF(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white font-mono"
                      />
                      <span className="text-[9px] text-gray-500 mt-0.5 block">Padrão MED: 40%</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-700 block mb-1">
                        Peso Nota Exame / NE (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pesoNE}
                        onChange={(e) => setPesoNE(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white text-amber-900 font-mono"
                      />
                      <span className="text-[9px] text-gray-500 mt-0.5 block">Padrão MED: 60%</span>
                    </div>
                  </div>
                </div>

                {/* Critérios de Nota Mínima */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Nota Mínima de Aprovação no Exame
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={escalaMaximaNivel}
                      value={notaAprovacaoMin}
                      onChange={(e) => setNotaAprovacaoMin(parseFloat(e.target.value) || 10)}
                      className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Nota Mínima para Recurso
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={escalaMaximaNivel}
                      value={notaRecursoMin}
                      onChange={(e) => setNotaRecursoMin(parseFloat(e.target.value) || 7)}
                      className="w-full p-2 text-center font-bold border border-gray-300 rounded-lg bg-white text-rose-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* BLOCO E: GOVERNANÇA DA MAC & AVALIAÇÕES CONTÍNUAS         */}
            {/* ========================================================= */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-gray-900 border-b border-gray-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h4 className="text-sm font-black uppercase tracking-wide">
                  Governança das Avaliações Contínuas (MAC) & Validações
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mínimo de Avaliações Contínuas Exigidas por Trimestre
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={minAvaliacoes}
                    onChange={(e) => setMinAvaliacoes(Math.max(1, parseInt(e.target.value) || 2))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Se o professor lançar menos avaliações, a pauta exibirá advertência de pendência regulamentar.
                  </span>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <input
                    type="checkbox"
                    id="chk-descartar-menor"
                    checked={descartarMenor}
                    onChange={(e) => setDescartarMenor(e.target.checked)}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  />
                  <label htmlFor="chk-descartar-menor" className="font-bold text-gray-800 cursor-pointer">
                    Descartar a menor nota obtida pelo estudante (quando houver mais avaliações que o mínimo exigido)
                  </label>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* BLOCO F: SIMULADOR INTERATIVO EM TEMPO REAL AO VIVO       */}
            {/* ========================================================= */}
            <div className="p-6 bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Simulador Interativo de Fórmulas ao Vivo</h4>
                    <p className="text-xs text-slate-400">
                      Teste valores de exemplo para validar instantaneamente o comportamento do motor pedagógico antes de aplicar.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-600/40 text-xs font-bold rounded-full font-mono">
                  Escala Máxima: 0 a {escalaMaximaNivel} val.
                </span>
              </div>

              {/* Grid de Inputs de Simulação */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                {/* 1º Trimestre */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                    <span>1º Trimestre</span>
                    <span className="font-mono text-indigo-400 font-bold">{simCalcMT1} val</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">MAC</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simMAC1}
                        onChange={(e) => setSimMAC1(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">NPP</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simNPP1}
                        onChange={(e) => setSimNPP1(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">NPT</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simNPT1}
                        onChange={(e) => setSimNPT1(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2º Trimestre */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                    <span>2º Trimestre</span>
                    <span className="font-mono text-indigo-400 font-bold">{simCalcMT2} val</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">MAC</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simMAC2}
                        onChange={(e) => setSimMAC2(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">NPP</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simNPP2}
                        onChange={(e) => setSimNPP2(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">NPT</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simNPT2}
                        onChange={(e) => setSimNPT2(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3º Trimestre */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center justify-between">
                    <span>3º Trimestre</span>
                    <span className="font-mono text-purple-400 font-bold">{simCalcMT3} val</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">MAC</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simMAC3}
                        onChange={(e) => setSimMAC3(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">NPP</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simNPP3}
                        onChange={(e) => setSimNPP3(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">NPT</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={escalaMaximaNivel}
                        value={simNPT3}
                        onChange={(e) => setSimNPT3(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Exame Final */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Exame Nacional / Final</span>
                    <span className="font-mono text-amber-400 font-bold">{simNE} val</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Nota de Exame (NE)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={escalaMaximaNivel}
                      value={simNE}
                      onChange={(e) => setSimNE(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-center font-bold text-amber-400 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Resultados Finais Calculados */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
                {/* 1. Média de Frequência Anual */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Média de Frequência (MDF)
                  </span>
                  <div className="text-2xl font-black font-mono text-blue-400">
                    {simCalcMDF} <span className="text-xs text-slate-500 font-sans">val.</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    (MT1 + MT2 + MT3) / 3
                  </span>
                </div>

                {/* 2. Classes de Transição (Não Finais) */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                    Classes de Transição (Não Finais)
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {simCalcMF_NaoFinais} <span className="text-xs text-slate-500 font-sans">val.</span>
                  </div>
                  <div className={`text-xs font-black px-2 py-0.5 rounded-full inline-block ${
                    simCalcMF_NaoFinais >= (escalaMaximaNivel === 10 ? 5 : 10)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                      : 'bg-rose-950 text-rose-300 border border-rose-600/40'
                  }`}>
                    {simCalcMF_NaoFinais >= (escalaMaximaNivel === 10 ? 5 : 10) ? '✓ Transita de Classe' : '✗ Não Transita'}
                  </div>
                </div>

                {/* 3. Classes com Exame (Finais) */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">
                    Classes Finais com Exame (MF)
                  </span>
                  <div className="text-2xl font-black font-mono text-amber-400">
                    {simCalcMF_Finais} <span className="text-xs text-slate-500 font-sans">val.</span>
                  </div>
                  <div className={`text-xs font-black px-2 py-0.5 rounded-full inline-block ${
                    simCalcMF_Finais >= notaAprovacaoMin
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                      : simCalcMF_Finais >= notaRecursoMin
                        ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                        : 'bg-rose-950 text-rose-300 border border-rose-600/40'
                  }`}>
                    {simCalcMF_Finais >= notaAprovacaoMin 
                      ? '✓ Aprovado / Conclui' 
                      : simCalcMF_Finais >= notaRecursoMin 
                        ? '⚠ Recurso / Exame' 
                        : '✗ Reprovado'}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE GRAVAÇÃO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  As alterações gravadas serão imediatamente aplicadas aos boletins, pautas oficiais e cálculos de notas do SGE.
                </span>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={handleRestaurarPadraoMED}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Repor Padrão MED
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Salvar Regras Oficiais de Cálculo</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {modalConfigDocOpen && (
        <DocumentTemplateConfigModal
          escola={escola}
          isOpen={modalConfigDocOpen}
          onClose={() => setModalConfigDocOpen(false)}
          initialDocType={docConfigSelecionado}
          onSaved={() => notificar('Dizeres e disposição do documento guardados com sucesso!')}
        />
      )}
    </div>
  );
};
