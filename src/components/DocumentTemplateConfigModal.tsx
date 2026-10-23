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
  FileCheck2
} from 'lucide-react';
import { Escola, ConfiguracaoDocumentoCustomizado } from '../types';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';

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

  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const configAtual = configuracoes[docSelecionado] || {
    id: `conf-${docSelecionado}-${escola.id}`,
    escolaId: escola.id,
    tipoDocumento: docSelecionado,
    tituloOficial: 'DOCUMENTO OFICIAL',
    subtitulo: 'Ministério da Educação de Angola',
    textoCabecalho: 'REPÚBLICA DE ANGOLA\nGOVERNO PROVINCIAL\nGABINETE PROVINCIAL DA EDUCAÇÃO',
    textoCorpoAbertura: 'Certifica-se para os devidos efeitos legais e escolares que...',
    textoFechamento: 'Por ser verdade, mandou-se passar o presente documento.',
    textoRodape: 'Processado informaticamente pelo SGE-NG Angola.',
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
    }
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

  const handleSalvar = () => {
    dbService.salvarConfiguracaoDocumento(configAtual);
    setSucessoMsg(`Dizeres e disposição de "${DOCUMENT_OPTIONS.find(d => d.id === docSelecionado)?.label}" guardados com sucesso!`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Configurador Oficial de Dizeres & Disposição de Documentos</h2>
              <p className="text-xs text-blue-200">Personalize cabeçalhos, fórmulas legais, assinaturas e veja a pré-visualização ao vivo em A4</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader / Selector de Documentos */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2 overflow-x-auto custom-scrollbar">
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
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {sucessoMsg && (
          <div className="mx-6 mt-3 px-4 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {/* Corpo: Painel Dividido (Editor à esquerda / Pré-visualização ao vivo à direita) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto p-6 gap-6">
          {/* Coluna 1: Formulário de Configuração (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Documento Selecionado</span>
                <h3 className="text-sm font-bold text-gray-900">{DOCUMENT_OPTIONS.find(d => d.id === docSelecionado)?.label}</h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
                {configAtual.disposicao.orientacao === 'paisagem' ? 'Horizontal (Paisagem)' : 'Vertical (Retrato)'}
              </span>
            </div>

            {/* Dizeres Principais */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-600 tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Dizeres & Textos Oficiais</span>
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Título do Documento</label>
                <input 
                  type="text"
                  value={configAtual.tituloOficial}
                  onChange={(e) => handleAtualizarCampo('tituloOficial', e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Subtítulo / Descrição Formal</label>
                <input 
                  type="text"
                  value={configAtual.subtitulo}
                  onChange={(e) => handleAtualizarCampo('subtitulo', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Cabeçalho Ministerial (Linhas separadas)</label>
                <textarea 
                  rows={2}
                  value={configAtual.textoCabecalho}
                  onChange={(e) => handleAtualizarCampo('textoCabecalho', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Fórmula de Abertura / Certificação</label>
                <textarea 
                  rows={2}
                  value={configAtual.textoCorpoAbertura}
                  onChange={(e) => handleAtualizarCampo('textoCorpoAbertura', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Texto de Encerramento / Homologação</label>
                <textarea 
                  rows={2}
                  value={configAtual.textoFechamento}
                  onChange={(e) => handleAtualizarCampo('textoFechamento', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Artigo Legal / Decreto Executivo</label>
                <input 
                  type="text"
                  value={configAtual.artigoLegalDecreto}
                  onChange={(e) => handleAtualizarCampo('artigoLegalDecreto', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Observações de Rodapé</label>
                <input 
                  type="text"
                  value={configAtual.textoRodape}
                  onChange={(e) => handleAtualizarCampo('textoRodape', e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
                />
              </div>
            </div>

            {/* Disposição & Layout */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-600 tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Disposição Visual & Elementos Oficiais</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Orientação da Folha</label>
                  <select
                    value={configAtual.disposicao.orientacao}
                    onChange={(e) => handleAtualizarDisposicao('orientacao', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="retrato">Retrato (Vertical A4)</option>
                    <option value="paisagem">Paisagem (Horizontal A4)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Alinhamento de Logos</label>
                  <select
                    value={configAtual.disposicao.alinhamentoLogo}
                    onChange={(e) => handleAtualizarDisposicao('alinhamentoLogo', e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="duplo">Duplo (Insígnia Esq + Escola Dir)</option>
                    <option value="centro">Centralizado (Insígnia Centro)</option>
                    <option value="esquerda">Insígnia à Esquerda</option>
                  </select>
                </div>
              </div>

              {/* Toggles de Elementos */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirInsigniaRepublica}
                    onChange={(e) => handleAtualizarDisposicao('exibirInsigniaRepublica', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Insígnia da República</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirLogoEscola}
                    onChange={(e) => handleAtualizarDisposicao('exibirLogoEscola', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Logótipo da Escola</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={configAtual.disposicao.exibirCarimboBranco}
                    onChange={(e) => handleAtualizarDisposicao('exibirCarimboBranco', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Carimbo Branco / Selo</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
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
              <div className="pt-2 border-t border-gray-100">
                <span className="block text-[11px] font-bold text-gray-700 mb-1.5">Blocos de Assinatura a Exibir:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaDiretor}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaDiretor', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>O Director Geral</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaSubdiretor}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaSubdiretor', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Subdirector Pedagógico</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={configAtual.disposicao.exibirAssinaturaSecretaria}
                      onChange={(e) => handleAtualizarDisposicao('exibirAssinaturaSecretaria', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Chefia da Secretaria</span>
                  </label>

                  <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
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
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black uppercase text-gray-700 tracking-wider">Pré-visualização em Tempo Real (Folha Oficial A4)</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400">Escala de Impressão 1:1</span>
            </div>

            <div className="flex-1 bg-gray-200/80 rounded-2xl p-4 overflow-auto border border-gray-300 flex justify-center">
              {/* Folha A4 Simulada */}
              <div 
                className={`bg-white shadow-xl border border-gray-300 p-8 text-black transition-all ${
                  configAtual.disposicao.orientacao === 'paisagem' 
                    ? 'w-[780px] min-h-[520px]' 
                    : 'w-[520px] min-h-[720px]'
                } font-serif flex flex-col justify-between`}
              >
                {/* Cabeçalho */}
                <div>
                  <div className="flex items-start justify-between pb-4 border-b-2 border-black">
                    {configAtual.disposicao.exibirInsigniaRepublica && (
                      <div className="w-14 h-14 flex items-center justify-center shrink-0">
                        <InsigniaAngola className="w-12 h-12" />
                      </div>
                    )}

                    <div className="flex-1 text-center px-4">
                      {configAtual.textoCabecalho.split('\n').map((linha, idx) => (
                        <div key={idx} className="text-[10px] font-bold uppercase tracking-wide leading-tight">
                          {linha}
                        </div>
                      ))}
                      <div className="text-xs font-black uppercase mt-1 text-blue-950 font-sans tracking-wide">
                        {escola.nomeOficial}
                      </div>
                      <div className="text-[9px] italic text-gray-600 mt-0.5">
                        {configAtual.artigoLegalDecreto}
                      </div>
                    </div>

                    {configAtual.disposicao.exibirLogoEscola && (
                      <div className="w-14 h-14 flex items-center justify-center shrink-0 border border-gray-200 rounded p-1 bg-gray-50">
                        {escola.logotipo ? (
                          <img src={escola.logotipo} alt="Escola" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-blue-800" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Título e Subtítulo */}
                  <div className="text-center py-4 space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider underline decoration-1 underline-offset-4">
                      {configAtual.tituloOficial}
                    </h3>
                    <p className="text-[10px] font-semibold text-gray-700 italic">
                      {configAtual.subtitulo}
                    </p>
                  </div>

                  {/* Texto de Abertura */}
                  <div className="text-[11px] leading-relaxed text-justify mb-4 text-gray-900">
                    <p>{configAtual.textoCorpoAbertura}</p>
                  </div>

                  {/* Corpo Simulado Dinâmico de Acordo com o Tipo de Documento Selecionado */}
                  {/* Corpo Simulado Dinâmico de Acordo com o Tipo de Documento Selecionado */}
                  {docSelecionado === 'boletim_oficial' && (
                    <div className="border border-black p-3 bg-white rounded text-[10px] space-y-2 mb-3 font-sans">
                      <div className="grid grid-cols-3 border-b border-gray-300 pb-1.5 text-[9px]">
                        <div><span className="text-gray-500">Estudante:</span> <strong>[Nome Completo do Estudante]</strong></div>
                        <div><span className="text-gray-500">Nº Proc:</span> <strong className="font-mono">[Nº de Processo]</strong></div>
                        <div><span className="text-gray-500">Classe / Turma:</span> <strong>[Classe / Turma]</strong></div>
                      </div>
                      <table className="w-full text-[9px] border-collapse text-center">
                        <thead>
                          <tr className="bg-gray-100 border-y border-black font-bold">
                            <th className="p-1 text-left">Disciplinas Curriculares</th>
                            <th className="p-1">MAC</th>
                            <th className="p-1">NPP</th>
                            <th className="p-1">NPT</th>
                            <th className="p-1 bg-blue-50 text-blue-900 font-extrabold">MT</th>
                            <th className="p-1">Situação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr><td className="p-1 text-left font-semibold">[Disciplina Curricular 1]</td><td>—</td><td>—</td><td>—</td><td className="font-bold text-blue-800 bg-blue-50/50">—</td><td className="text-gray-600 font-bold">—</td></tr>
                          <tr><td className="p-1 text-left font-semibold">[Disciplina Curricular 2]</td><td>—</td><td>—</td><td>—</td><td className="font-bold text-blue-800 bg-blue-50/50">—</td><td className="text-gray-600 font-bold">—</td></tr>
                          <tr><td className="p-1 text-left font-semibold">[Disciplina Curricular 3]</td><td>—</td><td>—</td><td>—</td><td className="font-bold text-blue-800 bg-blue-50/50">—</td><td className="text-gray-600 font-bold">—</td></tr>
                        </tbody>
                      </table>
                      <div className="flex justify-between items-center bg-gray-50 p-1.5 border border-gray-300 rounded text-[9px]">
                        <span>Comportamento: <strong>[Excelente / Bom]</strong></span>
                        <span>Média Geral Trimestral: <strong className="text-blue-900 font-black text-xs font-mono">— Valores</strong></span>
                        <span className="text-gray-700 font-bold bg-gray-200 px-2 py-0.5 rounded">[Situação Final]</span>
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'pauta_trimestral' && (
                    <div className="border border-black p-2 bg-white rounded text-[9px] space-y-2 mb-3">
                      <div className="flex justify-between font-bold border-b pb-1 text-[8px] uppercase text-gray-700">
                        <span>Pauta Geral • [Turma] • [Turno]</span>
                        <span>Ano Lectivo: {escola.anoLectivoActivo || '2025/2026'}</span>
                      </div>
                      <table className="w-full border-collapse text-center text-[8px]">
                        <thead>
                          <tr className="bg-gray-100 border border-black font-bold">
                            <th className="p-0.5 border border-black">Nº</th>
                            <th className="p-0.5 border border-black text-left">Nome Completo do Estudante</th>
                            <th className="p-0.5 border border-black">Disc. 1</th>
                            <th className="p-0.5 border border-black">Disc. 2</th>
                            <th className="p-0.5 border border-black">Disc. 3</th>
                            <th className="p-0.5 border border-black font-bold bg-blue-50">M.Geral</th>
                            <th className="p-0.5 border border-black">Deliberação</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border border-gray-300">
                            <td className="p-0.5 border border-gray-300 font-mono">01</td>
                            <td className="p-0.5 border border-gray-300 text-left font-bold">[Estudante Modelo A]</td>
                            <td className="p-0.5 border border-gray-300">—</td>
                            <td className="p-0.5 border border-gray-300">—</td>
                            <td className="p-0.5 border border-gray-300">—</td>
                            <td className="p-0.5 border border-gray-300 font-bold bg-blue-50 text-blue-900">—</td>
                            <td className="p-0.5 border border-gray-300 font-bold text-gray-600">—</td>
                          </tr>
                          <tr className="border border-gray-300 bg-gray-50/50">
                            <td className="p-0.5 border border-gray-300 font-mono">02</td>
                            <td className="p-0.5 border border-gray-300 text-left font-bold">[Estudante Modelo B]</td>
                            <td className="p-0.5 border border-gray-300">—</td>
                            <td className="p-0.5 border border-gray-300">—</td>
                            <td className="p-0.5 border border-gray-300">—</td>
                            <td className="p-0.5 border border-gray-300 font-bold bg-blue-50 text-blue-900">—</td>
                            <td className="p-0.5 border border-gray-300 font-bold text-gray-600">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {docSelecionado === 'certificado' && (
                    <div className="border-2 border-amber-900/40 p-4 bg-amber-50/20 rounded text-[10px] space-y-2 mb-3 text-justify font-serif">
                      <p className="leading-relaxed">
                        O Director Geral da <strong className="font-sans">{escola.nomeOficial}</strong>, ao abrigo das disposições legais vigentes do Ministério da Educação, certifica que:
                      </p>
                      <div className="text-center py-2">
                        <span className="text-sm font-black font-sans uppercase tracking-wider text-blue-950 border-b-2 border-black pb-0.5">
                          [NOME COMPLETO DO ESTUDANTE]
                        </span>
                      </div>
                      <p className="leading-relaxed text-[9px]">
                        Filho de [Filiação Paterna] e de [Filiação Materna], natural de [Naturalidade], Província de [Província], portador do B.I. n.º [Nº do Documento], concluiu no ano lectivo de {escola.anoLectivoActivo || '2025/2026'} o <strong>[Nível / Ciclo de Ensino]</strong>, no Curso de <strong>[Opção de Estudo]</strong>, com a média final de:
                      </p>
                      <div className="text-center font-bold font-sans text-xs text-blue-900 bg-white border border-amber-300 py-1 rounded">
                        [CLASSIFICAÇÃO FINAL POR EXTENSO]
                      </div>
                      <p className="text-[8.5px] italic text-gray-600">
                        Registo do Livro n.º [Livro], Folha n.º [Folha], Assento n.º [Assento].
                      </p>
                    </div>
                  )}

                  {docSelecionado === 'declaracao_notas' && (
                    <div className="border border-black p-3 bg-white rounded text-[9.5px] space-y-2 mb-3">
                      <p className="leading-relaxed">
                        Declara-se, para os efeitos convenientes, que <strong>[Nome Completo do Estudante]</strong> obteve o seguinte aproveitamento nas disciplinas curriculares:
                      </p>
                      <div className="grid grid-cols-3 gap-2 border border-gray-300 p-2 bg-gray-50 text-center font-mono text-[9px]">
                        <div>[Disciplina 1]: <strong>— val.</strong></div>
                        <div>[Disciplina 2]: <strong>— val.</strong></div>
                        <div>[Disciplina 3]: <strong>— val.</strong></div>
                        <div>[Disciplina 4]: <strong>— val.</strong></div>
                        <div>[Disciplina 5]: <strong>— val.</strong></div>
                        <div>Média Geral: <strong className="text-blue-900">— val.</strong></div>
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'declaracao_matricula' && (
                    <div className="border border-gray-400 p-3 bg-white rounded text-[10px] space-y-2 mb-3 text-justify">
                      <p className="leading-relaxed">
                        Declara-se que <strong>[Nome Completo do Estudante]</strong> encontra-se regularmente matriculado nesta instituição no ano lectivo activo, na <strong>[Classe]</strong>, [Turma], no Curso de <strong>[Curso]</strong>, com aproveitamento regular e sem qualquer impedimento de ordem disciplinar.
                      </p>
                    </div>
                  )}

                  {docSelecionado === 'cartao_estudante' && (
                    <div className="border-2 border-blue-600 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-[10px] flex items-center justify-between gap-3 mb-3">
                      <div className="w-16 h-20 bg-gray-200 border border-gray-400 rounded flex items-center justify-center text-gray-500 font-bold text-[8px] text-center">
                        FOTO 3x4
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-blue-950 text-xs">[Nome do Estudante]</div>
                        <div className="text-[9px] text-gray-600">Proc. n.º: <strong className="font-mono text-black">[Nº Proc.]</strong></div>
                        <div className="text-[9px] text-gray-600">Classe: <strong>[Classe • Turma]</strong></div>
                        <div className="text-[8px] font-mono text-blue-700 bg-white px-1.5 py-0.5 border border-blue-200 rounded inline-block">
                          Validade: {escola.anoLectivoActivo || '2025/2026'}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-white border border-gray-300 rounded flex items-center justify-center text-[7px] text-gray-400 font-mono text-center">
                        [QR-CODE]
                      </div>
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
                        <div>MF (40%): —</div>
                        <div>PE (60%): —</div>
                        <div>Média Final: <strong className="text-blue-900 font-bold">—</strong></div>
                        <div className="text-gray-600 font-bold">[Resultado]</div>
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'recibo_pagamento' && (
                    <div className="border border-dashed border-gray-500 p-3 bg-emerald-50/20 rounded text-[9.5px] space-y-2 mb-3">
                      <div className="flex justify-between border-b border-gray-300 pb-1 font-mono text-[9px]">
                        <span>Recibo n.º: <strong>[Nº Recibo]</strong></span>
                        <span>Data: <strong>{new Date().toLocaleDateString('pt-AO')}</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aluno: <strong>[Nome do Estudante]</strong></span>
                        <span>Emolumento: <strong>[Descrição do Emolumento]</strong></span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 border border-emerald-300 rounded">
                        <span className="font-bold text-gray-700">Total Liquidado:</span>
                        <span className="font-mono font-black text-sm text-emerald-800">[Valor em Kz]</span>
                      </div>
                    </div>
                  )}

                  {docSelecionado === 'guia_transferencia' && (
                    <div className="border border-gray-400 p-3 bg-white rounded text-[9.5px] space-y-1.5 mb-3 text-justify">
                      <p>Guia de Transferência Escolar do aluno <strong>[Nome do Estudante]</strong>, transferido da <strong>{escola.nomeOficial}</strong> para a instituição de destino com processo escolar em conformidade.</p>
                    </div>
                  )}

                  {/* Texto de Fechamento */}
                  <div className="text-[10px] leading-relaxed text-justify italic text-gray-800">
                    <p>{configAtual.textoFechamento}</p>
                  </div>
                </div>

                {/* Bloco de Assinaturas e Rodapé */}
                <div className="pt-6 border-t border-gray-300 space-y-4">
                  <div className="flex items-end justify-around text-center text-[10px] gap-2">
                    {configAtual.disposicao.exibirAssinaturaProfessor && (
                      <div className="flex-1">
                        <div className="border-b border-black pb-1 mb-1 font-sans font-bold">
                          O Professor Titular
                        </div>
                        <span className="text-[9px] text-gray-500">Assinatura Reconhecida</span>
                      </div>
                    )}

                    {configAtual.disposicao.exibirAssinaturaSecretaria && (
                      <div className="flex-1">
                        <div className="border-b border-black pb-1 mb-1 font-sans font-bold">
                          {escola.chefeSecretariaNome || 'A Chefia de Secretaria'}
                        </div>
                        <span className="text-[9px] text-gray-500">Conferido por</span>
                      </div>
                    )}

                    {configAtual.disposicao.exibirAssinaturaSubdiretor && (
                      <div className="flex-1">
                        <div className="border-b border-black pb-1 mb-1 font-sans font-bold">
                          {escola.subdiretorPedagogicoNome || 'O Subdirector Pedagógico'}
                        </div>
                        <span className="text-[9px] text-gray-500">Visto Pedagógico</span>
                      </div>
                    )}

                    {configAtual.disposicao.exibirAssinaturaDiretor && (
                      <div className="flex-1">
                        <div className="border-b border-black pb-1 mb-1 font-sans font-bold">
                          {escola.diretorGeralNome || 'O Director Geral'}
                        </div>
                        <span className="text-[9px] text-gray-500">Homologado</span>
                      </div>
                    )}

                    {configAtual.disposicao.exibirCarimboBranco && (
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-[8px] font-sans font-bold text-gray-500 text-center leading-tight">
                        L.S.<br/>Selo Branco
                      </div>
                    )}
                  </div>

                  {/* Rodapé e QR */}
                  <div className="flex items-center justify-between text-[8px] text-gray-500 pt-2 border-t border-gray-100">
                    <span>{configAtual.textoRodape}</span>
                    {configAtual.disposicao.exibirCodigoQR && (
                      <span className="font-mono bg-gray-100 px-1 py-0.5 rounded border border-gray-300">
                        [QR-CODE AUTH: SGE-{escola.id.slice(0, 6).toUpperCase()}]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRestaurarPadrao}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repor Padrão MED</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
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
