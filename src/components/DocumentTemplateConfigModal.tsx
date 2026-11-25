import React, { useState } from 'react';
import { 
  FileText, 
  Settings, 
  Eye, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Printer, 
  Layers, 
  AlignLeft, 
  AlignCenter, 
  Columns, 
  Sparkles,
  ShieldCheck,
  Building2,
  X,
  FileSpreadsheet,
  Award,
  CreditCard,
  Receipt,
  FileCheck2,
  UserCheck,
  Briefcase,
  ClipboardCheck,
  Plus,
  CheckSquare,
  Palette
} from 'lucide-react';
import { Escola, ConfiguracaoDocumentoCustomizado, ConfiguracaoCamposDocumento } from '../types';
import { dbService, DEFAULT_CAMPOS_DADOS_DOCUMENTO } from '../services/storage';
import { formatarDataAngolana } from '../utils/dateFormat';
import { InsigniaAngola } from '../constants/insignia';
import {
  DOCUMENT_PLACEHOLDER_CHIPS,
  interpolarTextoDocumento,
  mesclarCamposDocumento,
  obterSecoesCamposPorDocumento,
  DocumentTemplateContext
} from '../utils/documentTemplateResolver';

interface DocumentTemplateConfigModalProps {
  escola: Escola;
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: string;
  onSaved?: () => void;
}

const DOCUMENT_OPTIONS = [
  { id: 'pauta_trimestral', label: 'Pauta Trimestral Oficial', icon: FileSpreadsheet, orientacao: 'paisagem' },
  { id: 'boletim_oficial', label: 'Boletim de Notas Trimestrais', icon: FileText, orientacao: 'retrato' },
  { id: 'certificado', label: 'Certificado de Habilitações Literárias', icon: Award, orientacao: 'retrato' },
  { id: 'declaracao_notas', label: 'Declaração com Notas', icon: FileCheck2, orientacao: 'retrato' },
  { id: 'declaracao_matricula', label: 'Declaração de Matrícula Efectiva', icon: FileText, orientacao: 'retrato' },
  { id: 'ficha_individual_aluno', label: 'Ficha Individual do Aluno', icon: UserCheck, orientacao: 'retrato' },
  { id: 'ficha_individual_funcionario', label: 'Ficha Individual do Funcionário', icon: Briefcase, orientacao: 'retrato' },
  { id: 'ficha_presencas', label: 'Ficha de Presenças', icon: ClipboardCheck, orientacao: 'paisagem' },
  { id: 'cartao_estudante', label: 'Cartão / Passe de Estudante', icon: CreditCard, orientacao: 'retrato' },
  { id: 'termo_exame', label: 'Termo de Exame e Deliberação do Júri', icon: Layers, orientacao: 'paisagem' },
  { id: 'guia_transferencia', label: 'Guia de Transferência Escolar', icon: FileText, orientacao: 'retrato' },
  { id: 'recibo_pagamento', label: 'Recibo de Pagamento de Propinas', icon: Receipt, orientacao: 'retrato' }
];

export const DocumentTemplateConfigModal: React.FC<DocumentTemplateConfigModalProps> = ({
  escola,
  isOpen,
  onClose,
  initialDocType = 'pauta_trimestral',
  onSaved
}) => {
  const [docSelecionado, setDocSelecionado] = useState<string>(initialDocType);
  const [configuracoes, setConfiguracoes] = useState<Record<string, ConfiguracaoDocumentoCustomizado>>(() =>
    dbService.getConfiguracoesDocumentos(escola.id)
  );
  const [campoFocado, setCampoFocado] = useState<'textoCabecalho' | 'textoCorpoAbertura' | 'textoFechamento' | 'textoRodape'>('textoCorpoAbertura');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseConfig: ConfiguracaoDocumentoCustomizado = configuracoes[docSelecionado] || {
    id: `conf-${docSelecionado}-${escola.id}`,
    escolaId: escola.id,
    tipoDocumento: docSelecionado,
    tituloOficial: 'DOCUMENTO OFICIAL',
    subtitulo: 'Ministério da Educação de Angola',
    textoCabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL\nGABINETE PROVINCIAL DA EDUCAÇÃO',
    textoCorpoAbertura: 'Certifica-se para os devidos efeitos legais e escolares que...',
    textoFechamento: 'Por ser verdade, mandou-se passar o presente documento.',
    textoRodape: '',
    artigoLegalDecreto: escola.decretoCriacao || 'Decreto Executivo n.º 250/18',
    disposicao: {
      orientacao: 'retrato',
      alinhamentoLogo: 'duplo',
      exibirInsigniaRepublica: true,
      exibirLogoEscola: true,
      exibirCarimboBranco: true,
      exibirCodigoQR: true,
      exibirAssinaturaDiretor: true,
      exibirAssinaturaSubdiretor: true,
      exibirAssinaturaSecretaria: true,
      exibirAssinaturaProfessor: false,
      tamanhoFonte: 'padrao',
      corDestaque: '#1e3a8a'
    },
    camposDados: { ...DEFAULT_CAMPOS_DADOS_DOCUMENTO }
  };

  const camposDoc = mesclarCamposDocumento(baseConfig);
  const configAtual: ConfiguracaoDocumentoCustomizado = {
    ...baseConfig,
    camposDados: camposDoc
  };

  // Carregar amostra real de dados da escola para pré-visualização fidedigna
  const alunosEscola = dbService.getAlunos(escola.id);
  const turmasEscola = dbService.getTurmas().filter(t => t.escolaId === escola.id);
  const funcsEscola = dbService.getFuncionarios(escola.id);
  const alunoAmostra = alunosEscola[0] || null;
  const turmaAmostra = (alunoAmostra ? turmasEscola.find(t => t.id === alunoAmostra.turmaId) : turmasEscola[0]) || null;
  const funcAmostra = funcsEscola.find(f => f.role !== 'AdminGeral') || null;
  const diretorEscola = funcsEscola.find(f => f.role === 'DiretorGeral') || null;
  const subdiretorEscola = funcsEscola.find(f => f.role === 'SubdiretorPedagogico') || null;

  const previewCtx: DocumentTemplateContext = {
    escola,
    aluno: alunoAmostra,
    turma: turmaAmostra,
    funcionario: funcAmostra,
    diretor: diretorEscola,
    subdiretor: subdiretorEscola,
    anoLectivo: escola.anoLectivoActivo || String(new Date().getFullYear()),
    trimestre: '1º Trimestre',
    livro: '01/2026',
    folha: '14',
    numeroRegisto: '0042',
    mediaGeral: '15.4',
    situacaoFinal: 'Apto / Transita',
    camposDados: camposDoc
  };

  const handleAtualizarCampo = (campo: keyof ConfiguracaoDocumentoCustomizado, valor: any) => {
    setConfiguracoes(prev => ({
      ...prev,
      [docSelecionado]: {
        ...configAtual,
        [campo]: valor
      }
    }));
  };

  const handleAtualizarDisposicao = (campo: keyof ConfiguracaoDocumentoCustomizado['disposicao'], valor: any) => {
    setConfiguracoes(prev => ({
      ...prev,
      [docSelecionado]: {
        ...configAtual,
        disposicao: {
          ...configAtual.disposicao,
          [campo]: valor
        }
      }
    }));
  };

  const handleAtualizarCampoDado = (chave: keyof ConfiguracaoCamposDocumento, valor: boolean) => {
    setConfiguracoes(prev => ({
      ...prev,
      [docSelecionado]: {
        ...configAtual,
        camposDados: {
          ...camposDoc,
          [chave]: valor
        }
      }
    }));
  };

  const handleMarcarTodosCampos = (marcar: boolean) => {
    const secoes = obterSecoesCamposPorDocumento(docSelecionado);
    const atualizado = { ...camposDoc };
    secoes.forEach(s => {
      s.campos.forEach(c => {
        atualizado[c.chave] = marcar;
      });
    });
    setConfiguracoes(prev => ({
      ...prev,
      [docSelecionado]: {
        ...configAtual,
        camposDados: atualizado
      }
    }));
  };

  const handleInserirVariavel = (token: string) => {
    const atual = String(configAtual[campoFocado] || '');
    const separador = atual && !atual.endsWith(' ') && !atual.endsWith('\n') ? ' ' : '';
    handleAtualizarCampo(campoFocado, `${atual}${separador}${token}`);
  };

  const handleSalvar = () => {
    dbService.salvarConfiguracaoDocumento(configAtual);
    setSucessoMsg(`Dizeres, campos selecionados e disposição de "${DOCUMENT_OPTIONS.find(d => d.id === docSelecionado)?.label}" guardados com sucesso!`);
    if (onSaved) onSaved();
    setTimeout(() => setSucessoMsg(null), 3500);
  };

  const handleRestaurarPadrao = () => {
    const padrao = dbService.getConfiguracoesDocumentos(escola.id)[docSelecionado];
    if (padrao) {
      setConfiguracoes(prev => ({
        ...prev,
        [docSelecionado]: padrao
      }));
      setSucessoMsg('Configurações repostas para o padrão ministerial oficial.');
      setTimeout(() => setSucessoMsg(null), 3000);
    }
  };

  const secoesCampos = obterSecoesCamposPorDocumento(docSelecionado);
  const chipsVisiveis = DOCUMENT_PLACEHOLDER_CHIPS.filter(chip => {
    if (docSelecionado === 'ficha_individual_funcionario') {
      return chip.grupo === 'Escola' || chip.grupo === 'Funcionário';
    }
    return chip.grupo !== 'Funcionário';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 dark:bg-slate-950/80 backdrop-blur-xs p-2 sm:p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs shrink-0">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate">Configurador Oficial de Dizeres & Disposição de Documentos</h2>
              <p className="text-xs text-blue-200 truncate">Personalize cabeçalhos, fórmulas legais, assinaturas e veja a pré-visualização ao vivo em A4</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader / Selector de Documentos */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {DOCUMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = docSelecionado === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDocSelecionado(opt.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {sucessoMsg && (
          <div className="mx-4 sm:mx-6 mt-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {/* Corpo: Painel Dividido (Editor à esquerda / Pré-visualização ao vivo à direita) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto p-4 sm:p-6 gap-6">
          {/* Coluna 1: Formulário de Configuração (5 cols) */}
          <div className="lg:col-span-5 space-y-4 min-w-0">
            <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 tracking-wider">Documento Selecionado</span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{DOCUMENT_OPTIONS.find(d => d.id === docSelecionado)?.label}</h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-lg shrink-0">
                {configAtual.disposicao.orientacao === 'paisagem' ? 'Horizontal (Paisagem)' : 'Vertical (Retrato)'}
              </span>
            </div>

            {/* Dizeres Principais */}
            <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-600 dark:text-slate-300 tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Dizeres & Textos Oficiais</span>
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Título do Documento</label>
                <input 
                  type="text"
                  value={configAtual.tituloOficial}
                  onChange={(e) => handleAtualizarCampo('tituloOficial', e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Subtítulo / Descrição Formal</label>
                <input 
                  type="text"
                  value={configAtual.subtitulo}
                  onChange={(e) => handleAtualizarCampo('subtitulo', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Cabeçalho Ministerial (Linhas separadas)</label>
                <textarea 
                  rows={2}
                  value={configAtual.textoCabecalho}
                  onFocus={() => setCampoFocado('textoCabecalho')}
                  onChange={(e) => handleAtualizarCampo('textoCabecalho', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Fórmula de Abertura / Certificação</label>
                <textarea 
                  rows={2}
                  value={configAtual.textoCorpoAbertura}
                  onFocus={() => setCampoFocado('textoCorpoAbertura')}
                  onChange={(e) => handleAtualizarCampo('textoCorpoAbertura', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Texto de Encerramento / Homologação</label>
                <textarea 
                  rows={2}
                  value={configAtual.textoFechamento}
                  onFocus={() => setCampoFocado('textoFechamento')}
                  onChange={(e) => handleAtualizarCampo('textoFechamento', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Artigo Legal / Decreto Executivo</label>
                <input 
                  type="text"
                  value={configAtual.artigoLegalDecreto}
                  onChange={(e) => handleAtualizarCampo('artigoLegalDecreto', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Observações de Rodapé</label>
                <input 
                  type="text"
                  value={configAtual.textoRodape}
                  onFocus={() => setCampoFocado('textoRodape')}
                  onChange={(e) => handleAtualizarCampo('textoRodape', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-slate-200"
                />
              </div>

              {/* Inserção Rápida de Dados Dinâmicos da Escola / Aluno / Funcionário */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
                    Inserir Dado Automático no Campo ({campoFocado === 'textoCabecalho' ? 'Cabeçalho' : campoFocado === 'textoCorpoAbertura' ? 'Abertura' : campoFocado === 'textoFechamento' ? 'Encerramento' : 'Rodapé'})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {chipsVisiveis.map(chip => (
                    <button
                      key={chip.token}
                      type="button"
                      onClick={() => handleInserirVariavel(chip.token)}
                      title={`Inserir ${chip.token}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{chip.rotulo}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                  Apenas os dados seleccionados abaixo serão buscados dos cadastros reais e incluídos no documento impresso.
                </p>
              </div>
            </div>

            {/* Seleção Estrita de Dados & Informações do Documento */}
            <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase text-gray-600 dark:text-slate-300 tracking-wider flex items-center space-x-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Dados que Entram no Documento</span>
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMarcarTodosCampos(true)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarcarTodosCampos(false)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 cursor-pointer"
                  >
                    Nenhum
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {secoesCampos.map(secao => (
                  <div key={secao.id} className="bg-gray-50/70 dark:bg-slate-800/40 rounded-lg p-2.5 border border-gray-200/70 dark:border-slate-800">
                    <div className="text-[10px] font-black uppercase text-gray-600 dark:text-slate-300 mb-1.5">{secao.titulo}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {secao.campos.map(campo => (
                        <label key={campo.chave} className="flex items-center space-x-2 text-[11px] text-gray-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!camposDoc[campo.chave]}
                            onChange={(e) => handleAtualizarCampoDado(campo.chave, e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                          />
                          <span className="leading-tight">{campo.rotulo}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disposição & Layout */}
            <div className="bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-600 dark:text-slate-300 tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Disposição Visual & Elementos Oficiais</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Orientação da Folha</label>
                  <select
                    value={configAtual.disposicao.orientacao}
                    onChange={(e) => handleAtualizarDisposicao('orientacao', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="retrato">Retrato (Vertical A4)</option>
                    <option value="paisagem">Paisagem (Horizontal A4)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Alinhamento de Logos</label>
                  <select
                    value={configAtual.disposicao.alinhamentoLogo}
                    onChange={(e) => handleAtualizarDisposicao('alinhamentoLogo', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="duplo">Duplo (Insígnia Esq + Escola Dir)</option>
                    <option value="centro">Centralizado (Insígnia Centro)</option>
                    <option value="esquerda">Insígnia à Esquerda</option>
                  </select>
                </div>
              </div>

              {/* Toggles de Elementos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirInsigniaRepublica}
                    onChange={(e) => handleAtualizarDisposicao('exibirInsigniaRepublica', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Insígnia da República</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirLogoEscola}
                    onChange={(e) => handleAtualizarDisposicao('exibirLogoEscola', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Logótipo da Escola</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirCarimboBranco}
                    onChange={(e) => handleAtualizarDisposicao('exibirCarimboBranco', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Carimbo Branco / Selo</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirCodigoQR}
                    onChange={(e) => handleAtualizarDisposicao('exibirCodigoQR', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Código QR de Autenticidade</span>
                </label>
              </div>

              {/* Assinaturas no Rodapé */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <span className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1.5">Blocos de Assinatura a Exibir:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaDiretor}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaDiretor', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>O Director Geral</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaSubdiretor}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaSubdiretor', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Subdirector Pedagógico</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaSecretaria}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaSecretaria', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Chefia da Secretaria</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaProfessor}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaProfessor', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Professor Titular / Júri</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Pré-visualização ao Vivo (7 cols) */}
          <div className="lg:col-span-7 flex flex-col min-w-0">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-black uppercase text-gray-700 dark:text-slate-200 tracking-wider">Pré-visualização em Tempo Real (Folha Oficial A4)</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">Escala de Impressão 1:1</span>
            </div>

            <div className="flex-1 bg-gray-200/80 dark:bg-slate-950/90 rounded-2xl p-4 overflow-auto border border-gray-300 dark:border-slate-800 flex justify-center">
              {/* Folha A4 Simulada */}
              <div 
                className={`bg-white shadow-xl border border-gray-300 p-8 text-black transition-all ${
                  configAtual.disposicao.orientacao === 'paisagem' 
                    ? 'w-[780px] min-h-[520px]' 
                    : 'w-[520px] min-h-[720px]'
                } font-serif flex flex-col justify-between ${
                  configAtual.disposicao.tamanhoFonte === 'compacto' ? 'text-[10px]' : configAtual.disposicao.tamanhoFonte === 'grande' ? 'text-[13px]' : 'text-[11px]'
                }`}
              >
                {/* Cabeçalho */}
                <div>
                  <div
                    className={`flex items-start justify-between pb-4 border-b-2 ${
                      configAtual.disposicao.alinhamentoLogo === 'esquerda' ? 'flex-row-reverse' : ''
                    }`}
                    style={{ borderColor: configAtual.disposicao.corDestaque || '#000000' }}
                  >
                    {configAtual.disposicao.exibirInsigniaRepublica && (
                      <div className="w-14 h-14 flex items-center justify-center shrink-0">
                        <InsigniaAngola className="w-12 h-12" />
                      </div>
                    )}

                    <div className={`flex-1 px-4 ${configAtual.disposicao.alinhamentoLogo === 'esquerda' ? 'text-left' : 'text-center'}`}>
                      {interpolarTextoDocumento(configAtual.textoCabecalho, previewCtx).split('\n').map((linha, idx) => (
                        <div key={idx} className="text-[10px] font-bold uppercase tracking-wide leading-tight">
                          {linha}
                        </div>
                      ))}
                      <div
                        className="text-xs font-black uppercase mt-1 font-sans tracking-wide"
                        style={{ color: configAtual.disposicao.corDestaque || '#172554' }}
                      >
                        {escola.nomeOficial}
                      </div>
                      {(camposDoc.mostrarProvinciaMunicipio || camposDoc.mostrarNif) && (
                        <div className="text-[8.5px] text-gray-600 font-sans mt-0.5">
                          {camposDoc.mostrarProvinciaMunicipio && `${escola.provincia || ''}${escola.municipio ? ` • ${escola.municipio}` : ''}`}
                          {camposDoc.mostrarProvinciaMunicipio && camposDoc.mostrarNif && escola.nif ? ' • ' : ''}
                          {camposDoc.mostrarNif && escola.nif ? `NIF: ${escola.nif}` : ''}
                        </div>
                      )}
                      {camposDoc.mostrarDecreto && (
                        <div className="text-[9px] italic text-gray-600 mt-0.5">
                          {configAtual.artigoLegalDecreto}
                        </div>
                      )}
                      {camposDoc.mostrarContatosEmail && (escola.telefone || escola.email) && (
                        <div className="text-[8px] text-gray-500 font-sans">
                          {escola.telefone || ''}{escola.telefone && escola.email ? ' | ' : ''}{escola.email || ''}
                        </div>
                      )}
                    </div>

                    {configAtual.disposicao.exibirLogoEscola && (
                      <div className="w-14 h-14 flex items-center justify-center shrink-0 border border-gray-200 rounded p-1 bg-gray-50">
                        {(escola.logotipoUrl || escola.logotipo) ? (
                          <img src={escola.logotipoUrl || escola.logotipo} alt="Escola" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-blue-800" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Título e Subtítulo */}
                  <div className="text-center py-4 space-y-1">
                    <h3
                      className="text-sm font-black uppercase tracking-wider underline decoration-1 underline-offset-4"
                      style={{ color: configAtual.disposicao.corDestaque || '#000000' }}
                    >
                      {configAtual.tituloOficial}
                    </h3>
                    <p className="text-[10px] font-semibold text-gray-700 italic">
                      {configAtual.subtitulo}
                    </p>
                  </div>

                  {/* Texto de Abertura */}
                  {configAtual.textoCorpoAbertura && (
                    <div className="text-[11px] leading-relaxed text-justify mb-4 text-gray-900">
                      <p>{interpolarTextoDocumento(configAtual.textoCorpoAbertura, previewCtx)}</p>
                    </div>
                  )}

                  {/* Corpo Simulado Dinâmico de Acordo com o Tipo de Documento e os Campos Selecionados */}
                  {docSelecionado === 'boletim_oficial' && (
                    <div className="border border-black p-3 bg-white rounded text-[10px] space-y-2 mb-3 font-sans">
                      <div className="grid grid-cols-3 border-b border-gray-300 pb-1.5 text-[9px] gap-2">
                        <div><span className="text-gray-500">Estudante:</span> <strong>{alunoAmostra?.nomeCompleto || '[Nome do Estudante]'}</strong></div>
                        {camposDoc.mostrarNumeroProcessoMatricula && (
                          <div><span className="text-gray-500">Nº Proc:</span> <strong className="font-mono">{alunoAmostra?.numeroProcesso || '[Nº Processo]'}</strong></div>
                        )}
                        {camposDoc.mostrarTurmaSalaTurno && (
                          <div><span className="text-gray-500">Classe / Turma:</span> <strong>{turmaAmostra ? `${turmaAmostra.classe} • ${turmaAmostra.nome}` : '[Classe / Turma]'}</strong></div>
                        )}
                        {camposDoc.mostrarCurso && (
                          <div><span className="text-gray-500">Curso:</span> <strong>{turmaAmostra?.curso || alunoAmostra?.curso || 'Geral'}</strong></div>
                        )}
                        {camposDoc.mostrarEncarregado && (
                          <div><span className="text-gray-500">Encarregado:</span> <strong>{alunoAmostra?.nomeEncarregado || alunoAmostra?.encarregadoNome || '[Encarregado]'}</strong></div>
                        )}
                      </div>
                      <table className="w-full text-[9px] border-collapse text-center">
                        <thead>
                          <tr className="bg-gray-100 border-y border-black font-bold">
                            <th className="p-1 text-left">Disciplinas Curriculares</th>
                            {camposDoc.mostrarMacNppNptDetalhado && (
                              <>
                                <th className="p-1">MAC</th>
                                <th className="p-1">NPP</th>
                                <th className="p-1">NPT</th>
                              </>
                            )}
                            <th className="p-1 bg-blue-50 text-blue-900 font-extrabold">MT</th>
                            {camposDoc.mostrarFaltas && <th className="p-1">Faltas</th>}
                            {camposDoc.mostrarSituacaoFinal && <th className="p-1">Situação</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="p-1 text-left font-semibold">[Disciplina Curricular 1]</td>
                            {camposDoc.mostrarMacNppNptDetalhado && (<><td>14.5</td><td>15.0</td><td>16.0</td></>)}
                            <td className="font-bold text-blue-800 bg-blue-50/50">15.2</td>
                            {camposDoc.mostrarFaltas && <td>0</td>}
                            {camposDoc.mostrarSituacaoFinal && <td className="text-emerald-700 font-bold">Apto</td>}
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex flex-wrap justify-between items-center bg-gray-50 p-1.5 border border-gray-300 rounded text-[9px] gap-2">
                        {camposDoc.mostrarComportamento && <span>Comportamento: <strong>Bom</strong></span>}
                        {camposDoc.mostrarMediaGeral && <span>Média Geral: <strong className="text-blue-900 font-black font-mono">15.2 Valores</strong></span>}
                        {camposDoc.mostrarSituacaoFinal && <span className="text-gray-700 font-bold bg-gray-200 px-2 py-0.5 rounded">Transita</span>}
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'pauta_trimestral' && (
                    <div className="border border-black p-2 bg-white rounded text-[9px] space-y-2 mb-3">
                      <div className="flex justify-between font-bold border-b pb-1 text-[8px] uppercase text-gray-700">
                        <span>
                          Pauta Geral
                          {camposDoc.mostrarTurmaSalaTurno ? ` • ${turmaAmostra?.nome || '[Turma]'} (${turmaAmostra?.turno || 'Manhã'})` : ''}
                          {camposDoc.mostrarCurso && turmaAmostra?.curso ? ` • ${turmaAmostra.curso}` : ''}
                        </span>
                        <span>Ano Lectivo: {escola.anoLectivoActivo || '[Ano Lectivo]'}</span>
                      </div>
                      <table className="w-full border-collapse text-center text-[8px]">
                        <thead>
                          <tr className="bg-gray-100 border border-black font-bold">
                            {camposDoc.mostrarNumeroOrdem && <th className="p-0.5 border border-black">Nº</th>}
                            {camposDoc.mostrarNumeroProcessoMatricula && <th className="p-0.5 border border-black">Proc.</th>}
                            <th className="p-0.5 border border-black text-left">Nome Completo do Estudante</th>
                            <th className="p-0.5 border border-black">Disc. 1</th>
                            <th className="p-0.5 border border-black">Disc. 2</th>
                            {camposDoc.mostrarMediaGeral && <th className="p-0.5 border border-black font-bold bg-blue-50">M.Geral</th>}
                            {camposDoc.mostrarSituacaoFinal && <th className="p-0.5 border border-black">Deliberação</th>}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border border-gray-300">
                            {camposDoc.mostrarNumeroOrdem && <td className="p-0.5 border border-gray-300 font-mono">01</td>}
                            {camposDoc.mostrarNumeroProcessoMatricula && <td className="p-0.5 border border-gray-300 font-mono">{alunoAmostra?.numeroProcesso || '2026-01'}</td>}
                            <td className="p-0.5 border border-gray-300 text-left font-bold">{alunoAmostra?.nomeCompleto || '[Estudante Modelo A]'}</td>
                            <td className="p-0.5 border border-gray-300">15</td>
                            <td className="p-0.5 border border-gray-300">14</td>
                            {camposDoc.mostrarMediaGeral && <td className="p-0.5 border border-gray-300 font-bold bg-blue-50 text-blue-900">14.5</td>}
                            {camposDoc.mostrarSituacaoFinal && <td className="p-0.5 border border-gray-300 font-bold text-emerald-700">Apto</td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {docSelecionado === 'certificado' && (
                    <div className="border-2 border-amber-900/40 p-4 bg-amber-50/20 rounded text-[10px] space-y-2 mb-3 text-justify font-serif">
                      <p className="leading-relaxed">
                        A Direcção da <strong className="font-sans">{escola.nomeOficial}</strong> certifica que:
                      </p>
                      <div className="text-center py-1.5">
                        <span className="text-sm font-black font-sans uppercase tracking-wider text-blue-950 border-b-2 border-black pb-0.5">
                          {alunoAmostra?.nomeCompleto || '[NOME COMPLETO DO ESTUDANTE]'}
                        </span>
                      </div>
                      <p className="leading-relaxed text-[9px]">
                        {camposDoc.mostrarFiliacao && `Filho(a) de ${alunoAmostra?.nomePai || '[Pai]'} e de ${alunoAmostra?.nomeMae || '[Mãe]'}, `}
                        {camposDoc.mostrarDataNascimento && `nascido(a) em ${alunoAmostra?.dataNascimento || '[Data]'}, `}
                        {camposDoc.mostrarNaturalidadeProvincia && `natural de ${alunoAmostra?.naturalidade || '[Naturalidade]'}, `}
                        {camposDoc.mostrarBI && `portador(a) do B.I. n.º ${alunoAmostra?.numeroBI || '[B.I.]'}, `}
                        concluiu no ano lectivo de {escola.anoLectivoActivo || '[Ano]'} a <strong>{turmaAmostra?.classe || alunoAmostra?.classeId || '[Classe]'}</strong>
                        {camposDoc.mostrarCurso && (turmaAmostra?.curso || alunoAmostra?.curso) ? ` (${turmaAmostra?.curso || alunoAmostra?.curso})` : ''}.
                      </p>
                      {(camposDoc.mostrarMediaGeral || camposDoc.mostrarEscalaExtenso) && (
                        <div className="text-center font-bold font-sans text-xs text-blue-900 bg-white border border-amber-300 py-1 rounded">
                          {camposDoc.mostrarMediaGeral ? 'Média Final: 15.4 Valores ' : ''}
                          {camposDoc.mostrarEscalaExtenso ? '(Quinze Valores — Bom)' : ''}
                        </div>
                      )}
                      {camposDoc.mostrarLivroFolhaRegisto && (
                        <p className="text-[8.5px] italic text-gray-600">
                          Registo do Livro n.º 01/2026, Folha n.º 14, Assento n.º 0042.
                        </p>
                      )}
                    </div>
                  )}

                  {docSelecionado === 'declaracao_notas' && (
                    <div className="border border-black p-3 bg-white rounded text-[9.5px] space-y-2 mb-3">
                      <p className="leading-relaxed">
                        Declara-se que <strong>{alunoAmostra?.nomeCompleto || '[Nome do Estudante]'}</strong>
                        {camposDoc.mostrarNumeroProcessoMatricula && `, Proc. n.º ${alunoAmostra?.numeroProcesso || '—'}`}
                        {camposDoc.mostrarFiliacao && `, filho(a) de ${alunoAmostra?.nomePai || '—'} e de ${alunoAmostra?.nomeMae || '—'}`}
                        {camposDoc.mostrarBI && `, B.I. n.º ${alunoAmostra?.numeroBI || '—'}`}
                        {camposDoc.mostrarTurmaSalaTurno && `, da turma ${turmaAmostra?.nome || '—'} (${turmaAmostra?.turno || 'Manhã'})`}
                        {camposDoc.mostrarCurso && (turmaAmostra?.curso || alunoAmostra?.curso) ? `, curso ${turmaAmostra?.curso || alunoAmostra?.curso}` : ''}, obteve o aproveitamento curricular abaixo:
                      </p>
                      <div className="grid grid-cols-3 gap-2 border border-gray-300 p-2 bg-gray-50 text-center font-mono text-[9px]">
                        <div>[Disciplina 1]: <strong>15 val.</strong></div>
                        <div>[Disciplina 2]: <strong>14 val.</strong></div>
                        {camposDoc.mostrarMediaGeral && (
                          <div>Média Geral: <strong className="text-blue-900">14.5 val.</strong></div>
                        )}
                      </div>
                      {camposDoc.mostrarLivroFolhaRegisto && (
                        <div className="text-[8px] text-gray-600 italic">Livro n.º 01 • Folha n.º 14 • Registo n.º 0042</div>
                      )}
                    </div>
                  )}

                  {docSelecionado === 'declaracao_matricula' && (
                    <div className="border border-gray-400 p-3 bg-white rounded text-[10px] space-y-2 mb-3 text-justify">
                      <p className="leading-relaxed">
                        Declara-se que <strong>{alunoAmostra?.nomeCompleto || '[Nome do Estudante]'}</strong>
                        {camposDoc.mostrarNumeroProcessoMatricula && `, Processo n.º ${alunoAmostra?.numeroProcesso || '—'}`}
                        {camposDoc.mostrarBI && `, B.I. n.º ${alunoAmostra?.numeroBI || '—'}`}
                        , encontra-se regularmente matriculado na <strong>{alunoAmostra?.classeId || turmaAmostra?.classe || '[Classe]'}</strong>
                        {camposDoc.mostrarTurmaSalaTurno && `, Turma ${turmaAmostra?.nome || '—'} (${turmaAmostra?.turno || 'Manhã'})`}
                        {camposDoc.mostrarCurso && (turmaAmostra?.curso || alunoAmostra?.curso) ? `, Curso de ${turmaAmostra?.curso || alunoAmostra?.curso}` : ''}.
                      </p>
                    </div>
                  )}

                  {docSelecionado === 'ficha_individual_aluno' && (
                    <div className="border border-black p-3 bg-white rounded text-[9px] space-y-2 mb-3 font-sans">
                      <div className="flex items-start justify-between gap-3 border-b border-gray-300 pb-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1">
                          <div><strong>Nome:</strong> {alunoAmostra?.nomeCompleto || '[Nome Completo]'}</div>
                          {camposDoc.mostrarNumeroProcessoMatricula && <div><strong>Nº Processo:</strong> {alunoAmostra?.numeroProcesso || '—'}</div>}
                          {camposDoc.mostrarBI && <div><strong>B.I.:</strong> {alunoAmostra?.numeroBI || '—'}</div>}
                          {camposDoc.mostrarDataNascimento && <div><strong>Nascimento:</strong> {alunoAmostra?.dataNascimento || '—'}</div>}
                          {camposDoc.mostrarFiliacao && <div><strong>Filiação:</strong> {alunoAmostra?.nomePai || '—'} / {alunoAmostra?.nomeMae || '—'}</div>}
                          {camposDoc.mostrarNaturalidadeProvincia && <div><strong>Naturalidade:</strong> {alunoAmostra?.naturalidade || '—'}</div>}
                          {camposDoc.mostrarResidencia && <div><strong>Residência:</strong> {alunoAmostra?.residencia || alunoAmostra?.bairro || '—'}</div>}
                          {camposDoc.mostrarEncarregado && <div><strong>Encarregado:</strong> {alunoAmostra?.nomeEncarregado || alunoAmostra?.encarregadoNome || '—'}</div>}
                          {camposDoc.mostrarContactoEncarregado && <div><strong>Contacto:</strong> {alunoAmostra?.telefoneEncarregado || alunoAmostra?.encarregadoTelefone || alunoAmostra?.telefone || '—'}</div>}
                          {camposDoc.mostrarTurmaSalaTurno && <div><strong>Turma/Turno:</strong> {turmaAmostra?.nome || '—'} • {turmaAmostra?.turno || '—'}</div>}
                        </div>
                        {camposDoc.mostrarFoto && (
                          <div className="w-12 h-14 border border-gray-400 bg-gray-100 flex items-center justify-center text-[7px] text-gray-500 shrink-0">
                            FOTO
                          </div>
                        )}
                      </div>
                      {camposDoc.mostrarHistoricoOcorrencias && (
                        <div className="text-[8px] text-gray-600">Histórico de Ocorrências & Rendimento: Incluído conforme ficha individual.</div>
                      )}
                    </div>
                  )}

                  {docSelecionado === 'ficha_individual_funcionario' && (
                    <div className="border border-black p-3 bg-white rounded text-[9px] space-y-2 mb-3 font-sans">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1">
                          <div><strong>Funcionário:</strong> {funcAmostra?.nomeCompleto || '[Nome do Funcionário]'}</div>
                          <div><strong>Cargo:</strong> {funcAmostra?.cargo || 'Docente'}</div>
                          {camposDoc.mostrarFuncionarioNumeroAgente && <div><strong>Nº Agente:</strong> {funcAmostra?.numeroAgente || '—'}</div>}
                          {camposDoc.mostrarFuncionarioBI && <div><strong>B.I.:</strong> {funcAmostra?.numeroBI || '—'}</div>}
                          {camposDoc.mostrarFuncionarioNif && <div><strong>NIF:</strong> {funcAmostra?.nif || '—'}</div>}
                          {camposDoc.mostrarFuncionarioContatos && <div><strong>Contactos:</strong> {funcAmostra?.telefone || '—'}</div>}
                          {camposDoc.mostrarFuncionarioGrauEspecialidade && <div><strong>Habilitação:</strong> {funcAmostra?.grauAcademico || 'Licenciatura'}</div>}
                          {camposDoc.mostrarFuncionarioCategoriaContrato && <div><strong>Categoria:</strong> {funcAmostra?.categoriaProfissional || funcAmostra?.tipoContrato || 'Efectivo'}</div>}
                          {camposDoc.mostrarFuncionarioDadosBancariosIbanInss && <div><strong>IBAN / INSS:</strong> {funcAmostra?.iban || 'AO06...'}</div>}
                          {camposDoc.mostrarFuncionarioCargaHoraria && <div><strong>Carga Horária:</strong> Turmas atribuídas activas</div>}
                        </div>
                        {camposDoc.mostrarFuncionarioFoto && (
                          <div className="w-12 h-14 border border-gray-400 bg-gray-100 flex items-center justify-center text-[7px] text-gray-500 shrink-0">
                            FOTO RH
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'ficha_presencas' && (
                    <div className="border border-black p-2 bg-white rounded text-[8.5px] space-y-1.5 mb-3 font-sans">
                      <div className="flex justify-between font-bold border-b pb-1">
                        <span>{camposDoc.mostrarTurmaSalaTurno ? `Turma: ${turmaAmostra?.nome || 'A'} • Sala ${turmaAmostra?.sala || '01'}` : 'Controlo de Frequência'}</span>
                        <span>{camposDoc.mostrarCurso ? `Curso: ${turmaAmostra?.curso || 'Geral'}` : ''}</span>
                      </div>
                      <table className="w-full border-collapse text-center">
                        <thead>
                          <tr className="bg-gray-100 border border-black">
                            {camposDoc.mostrarNumeroOrdem && <th className="p-0.5 border border-black">Nº</th>}
                            {camposDoc.mostrarNumeroProcessoMatricula && <th className="p-0.5 border border-black">Proc.</th>}
                            <th className="p-0.5 border border-black text-left">Estudante</th>
                            <th className="p-0.5 border border-black">Seg</th>
                            <th className="p-0.5 border border-black">Ter</th>
                            <th className="p-0.5 border border-black">Qua</th>
                            {camposDoc.mostrarFaltas && <th className="p-0.5 border border-black">Total Faltas</th>}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {camposDoc.mostrarNumeroOrdem && <td className="p-0.5 border border-gray-300">01</td>}
                            {camposDoc.mostrarNumeroProcessoMatricula && <td className="p-0.5 border border-gray-300">{alunoAmostra?.numeroProcesso || '2026-01'}</td>}
                            <td className="p-0.5 border border-gray-300 text-left font-semibold">{alunoAmostra?.nomeCompleto || '[Estudante]'}</td>
                            <td className="p-0.5 border border-gray-300 text-emerald-700 font-bold">P</td>
                            <td className="p-0.5 border border-gray-300 text-emerald-700 font-bold">P</td>
                            <td className="p-0.5 border border-gray-300 text-red-600 font-bold">F</td>
                            {camposDoc.mostrarFaltas && <td className="p-0.5 border border-gray-300 font-bold">1</td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {docSelecionado === 'cartao_estudante' && (
                    <div className="border-2 border-blue-600 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-[10px] flex items-center justify-between gap-3 mb-3">
                      {camposDoc.mostrarFoto && (
                        <div className="w-16 h-20 bg-gray-200 border border-gray-400 rounded flex items-center justify-center text-gray-500 font-bold text-[8px] text-center">
                          FOTO 3x4
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-blue-950 text-xs">{alunoAmostra?.nomeCompleto || '[Nome do Estudante]'}</div>
                        {camposDoc.mostrarNumeroProcessoMatricula && (
                          <div className="text-[9px] text-gray-600">Proc. n.º: <strong className="font-mono text-black">{alunoAmostra?.numeroProcesso || '[Nº Proc.]'}</strong></div>
                        )}
                        {camposDoc.mostrarTurmaSalaTurno && (
                          <div className="text-[9px] text-gray-600">Classe: <strong>{alunoAmostra?.classeId || '[Classe]'} • {turmaAmostra?.nome || '[Turma]'}</strong></div>
                        )}
                        <div className="text-[8px] font-mono text-blue-700 bg-white px-1.5 py-0.5 border border-blue-200 rounded inline-block">
                          Validade: {escola.anoLectivoActivo || '[Ano Lectivo]'}
                        </div>
                      </div>
                      {configAtual.disposicao.exibirCodigoQR && (
                        <div className="w-12 h-12 bg-white border border-gray-300 rounded flex items-center justify-center text-[7px] text-gray-400 font-mono text-center">
                          [QR-CODE]
                        </div>
                      )}
                    </div>
                  )}

                  {docSelecionado === 'termo_exame' && (
                    <div className="border border-black p-2 bg-white rounded text-[9px] space-y-1.5 mb-3">
                      <div className="flex justify-between font-bold border-b pb-1 text-[8px]">
                        <span>Termo de Exame • Prova Escrita (PE)</span>
                        <span>Disciplina: [Disciplina de Exame]</span>
                      </div>
                      <div className="text-[8px] text-gray-600">Júri Examinador: [Docente Presidente] (Presidente) • [Docente Secretário] (Secretário)</div>
                      <div className="grid grid-cols-4 gap-1 border border-gray-300 p-1 bg-gray-50 text-center font-mono text-[8px]">
                        <div>MF: 14.0</div>
                        <div>PE: 15.0</div>
                        {camposDoc.mostrarMediaGeral && <div>Média Final: <strong className="text-blue-900 font-bold">14.6</strong></div>}
                        {camposDoc.mostrarSituacaoFinal && <div className="text-emerald-700 font-bold">Apto</div>}
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'recibo_pagamento' && (
                    <div className="border border-dashed border-gray-500 p-3 bg-emerald-50/20 rounded text-[9.5px] space-y-2 mb-3">
                      <div className="flex justify-between border-b border-gray-300 pb-1 font-mono text-[9px]">
                        <span>Recibo n.º: <strong>[Nº Recibo]</strong></span>
                        <span>Data: <strong>{formatarDataAngolana(new Date(), 'curto')}</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aluno: <strong>{alunoAmostra?.nomeCompleto || '[Nome do Estudante]'}</strong></span>
                        <span>Emolumento: <strong>Propina / Taxa</strong></span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 border border-emerald-300 rounded">
                        <span className="font-bold text-gray-700">Total Liquidado:</span>
                        <span className="font-mono font-black text-sm text-emerald-800">[Valor em Kz]</span>
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'guia_transferencia' && (
                    <div className="border border-gray-400 p-3 bg-white rounded text-[9.5px] space-y-1.5 mb-3 text-justify">
                      <p>
                        Guia de Transferência Escolar do aluno <strong>{alunoAmostra?.nomeCompleto || '[Nome do Estudante]'}</strong>
                        {camposDoc.mostrarNumeroProcessoMatricula && ` (Proc. ${alunoAmostra?.numeroProcesso || '—'})`}
                        {camposDoc.mostrarBI && `, B.I. ${alunoAmostra?.numeroBI || '—'}`}, transferido da <strong>{escola.nomeOficial}</strong> para a instituição de destino.
                      </p>
                    </div>
                  )}

                  {/* Texto de Fechamento */}
                  {configAtual.textoFechamento && (
                    <div className="text-[10px] leading-relaxed text-justify italic text-gray-800">
                      <p>{interpolarTextoDocumento(configAtual.textoFechamento, previewCtx)}</p>
                    </div>
                  )}

                  {camposDoc.mostrarDataLocalExtenso && (
                    <div className="text-center text-[9.5px] text-gray-800 mt-3 font-medium">
                      {escola.municipio || escola.provincia || 'Angola'}, aos {formatarDataAngolana(new Date(), 'extenso')}.
                    </div>
                  )}
                </div>

                {/* Bloco de Assinaturas e Rodapé: Título (Cima) -> Traço (Meio) -> Nome do Titular (Baixo) */}
                <div className="pt-6 border-t border-gray-300 space-y-4">
                  {docSelecionado === 'certificado' ? (
                    <div className="flex items-end justify-between text-center text-[10px] gap-4">
                      <div className="text-left pb-2">
                        <span className="font-sans font-bold text-gray-900">Conferido por: ___________________________</span>
                      </div>

                      {configAtual.disposicao.exibirCarimboBranco && (
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-[8px] font-sans font-bold text-gray-500 text-center leading-tight shrink-0">
                          L.S.<br/>Selo Branco
                        </div>
                      )}

                      {configAtual.disposicao.exibirAssinaturaDiretor && (
                        <div className="flex-1 max-w-[210px] space-y-1">
                          <p className="font-sans font-bold text-[9px] uppercase text-gray-900">
                            {escola.diretorGeralGenero === 'F' ? 'A Directora Geral' : 'O Director Geral'}
                          </p>
                          <div className="h-5" />
                          <div className="border-b border-black w-full" />
                          <p className="text-[9px] font-sans font-bold text-gray-800 uppercase">
                            {escola.diretorGeralNome || 'Direcção Geral da Escola'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-end justify-around text-center text-[10px] gap-2">
                      {configAtual.disposicao.exibirAssinaturaProfessor && (
                        <div className="flex-1 space-y-1">
                          <p className="font-sans font-bold text-[9px] uppercase text-gray-900">O Professor Titular</p>
                          <div className="h-5" />
                          <div className="border-b border-black w-full" />
                          <span className="text-[9px] font-sans font-semibold text-gray-800">[Nome do Docente]</span>
                        </div>
                      )}

                      {configAtual.disposicao.exibirAssinaturaSecretaria && (
                        <div className="flex-1 space-y-1">
                          <p className="font-sans font-bold text-[9px] uppercase text-gray-900">A Chefia de Secretaria</p>
                          <div className="h-5" />
                          <div className="border-b border-black w-full" />
                          <span className="text-[9px] font-sans font-semibold text-gray-800">
                            {escola.chefeSecretariaNome || 'Chefia da Secretaria'}
                          </span>
                        </div>
                      )}

                      {configAtual.disposicao.exibirAssinaturaSubdiretor && (
                        <div className="flex-1 space-y-1">
                          <p className="font-sans font-bold text-[9px] uppercase text-gray-900">O Subdirector Pedagógico</p>
                          <div className="h-5" />
                          <div className="border-b border-black w-full" />
                          <span className="text-[9px] font-sans font-semibold text-gray-800">
                            {escola.subdiretorPedagogicoNome || 'Subdirecção Pedagógica'}
                          </span>
                        </div>
                      )}

                      {configAtual.disposicao.exibirAssinaturaDiretor && (
                        <div className="flex-1 space-y-1">
                          <p className="font-sans font-bold text-[9px] uppercase text-gray-900">
                            {escola.diretorGeralGenero === 'F' ? 'A Directora Geral' : 'O Director Geral'}
                          </p>
                          <div className="h-5" />
                          <div className="border-b border-black w-full" />
                          <span className="text-[9px] font-sans font-semibold text-gray-800">
                            {escola.diretorGeralNome || 'Direcção Geral da Escola'}
                          </span>
                        </div>
                      )}

                      {configAtual.disposicao.exibirCarimboBranco && (
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-[8px] font-sans font-bold text-gray-500 text-center leading-tight">
                          L.S.<br/>Selo Branco
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rodapé e QR */}
                  <div className="flex items-center justify-between text-[8px] text-gray-500 pt-2 border-t border-gray-100">
                    <span>{interpolarTextoDocumento(configAtual.textoRodape, previewCtx)}</span>
                    {configAtual.disposicao.exibirCodigoQR && (
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                        [CÓDIGO QR OFICIAL]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRestaurarPadrao}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repor Padrão MED</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Configuração & Disposição</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
