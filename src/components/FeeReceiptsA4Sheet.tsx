import React, { useMemo, useState } from 'react';
import { Download, Printer, X, CheckSquare, Square, Search, Receipt } from 'lucide-react';
import { Escola } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { formatarDataHoraAngolana } from '../utils/dateFormat';
import { dbService } from '../services/storage';
import { safeSearchMatch } from '../utils/securitySanitizer';

export interface ReciboEmolumentoA4Item {
  id: string;
  numeroRecibo: string;
  alunoId?: string;
  alunoNome: string;
  codigoMatricula?: string;
  classeTurma?: string;
  descricao: string;
  valorKz?: number;
  multaKz?: number;
  valorTotalKz: number;
  metodoPagamento?: string;
  numeroComprovativo?: string;
  dataHora: string;
  operadorNome?: string;
}

interface FeeReceiptsA4GridProps {
  escola: Escola;
  recibos: ReciboEmolumentoA4Item[];
  nomeAtendentePadrao?: string;
  gridId?: string;
}

export const FeeReceiptsA4Grid: React.FC<FeeReceiptsA4GridProps> = ({
  escola,
  recibos,
  nomeAtendentePadrao = '',
  gridId = 'recibos-emolumentos-a4-grid'
}) => {
  const configSistema = useMemo(() => dbService.getConfiguracaoSistema(), []);

  const paginas = useMemo(() => {
    const pages: ReciboEmolumentoA4Item[][] = [];
    for (let i = 0; i < recibos.length; i += 8) {
      pages.push(recibos.slice(i, i + 8));
    }
    return pages;
  }, [recibos]);

  if (recibos.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500 text-sm">
        Nenhum recibo de emolumento selecionado para emissão em folha A4.
      </div>
    );
  }

  return (
    <div id={gridId} data-passes-grid="true" data-doc-root="true" className="space-y-6 documento-oficial-print">
      {paginas.map((paginaRecibos, pageIndex) => (
        <div
          key={`page-recibos-${pageIndex}`}
          data-passes-page="true"
          className="bg-white p-2 pb-4 border border-gray-200 shadow-xs rounded-xl print:border-0 print:shadow-none print:p-0 print:pb-3"
        >
          <div className="passes-sheet-grid grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {paginaRecibos.map((item) => {
              const nomeAtendente = (item.operadorNome || nomeAtendentePadrao || '').trim() || 'Secretaria / Tesouraria';
              const corPrimaria = escola.corPrimaria || '#1e3a8a';

              return (
                <div
                  key={item.id}
                  className="bg-white border-2 rounded-lg p-2.5 flex flex-col justify-between min-h-[240px] h-auto text-black select-none print:break-inside-avoid"
                  style={{ borderColor: corPrimaria }}
                >
                  {/* Cabeçalho Oficial: Insígnia + República de Angola + Província/Município + Escola + Recibo Nº */}
                  <div
                    className="border-b pb-1 flex items-center justify-between gap-1.5"
                    style={{ borderColor: `${corPrimaria}40` }}
                  >
                    <div className="h-6 w-6 flex items-center justify-center shrink-0">
                      {Boolean(configSistema.insigniaNacionalUrl?.trim()) ? (
                        <img
                          src={configSistema.insigniaNacionalUrl}
                          alt="Insígnia"
                          className="h-6 w-6 object-contain"
                        />
                      ) : (
                        <InsigniaAngola size={22} />
                      )}
                    </div>

                    <div className="flex-1 text-center min-w-0 px-1">
                      <p className="text-[7px] font-black uppercase text-gray-800 tracking-wider leading-[1.15]">
                        República de Angola
                      </p>
                      {(escola.provincia || escola.municipio) && (
                        <p className="text-[6.5px] font-bold uppercase text-gray-600 whitespace-normal break-words leading-[1.15]">
                          {escola.provincia ? `Província: ${escola.provincia}` : ''}
                          {escola.provincia && escola.municipio ? ' • ' : ''}
                          {escola.municipio ? `Município: ${escola.municipio}` : ''}
                        </p>
                      )}
                      <h4
                        className="text-[8px] font-black uppercase whitespace-normal break-words leading-[1.15] mt-0.5"
                        style={{ color: corPrimaria }}
                      >
                        {escola.nomeOficial}
                      </h4>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[7px] font-black font-mono text-white uppercase"
                        style={{ backgroundColor: corPrimaria }}
                      >
                        RECIBO
                      </span>
                      <p className="text-[7px] font-mono font-bold text-gray-900 mt-0.5">
                        N.º {item.numeroRecibo}
                      </p>
                    </div>
                  </div>

                  {/* Dados do Pagamento e do Estudante */}
                  <div className="my-1.5 space-y-1 text-[8.5px] leading-[1.25] flex-1">
                    <div className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                      <div className="min-w-0 flex-1">
                        <span className="text-[7px] font-bold uppercase text-gray-500 block">Estudante</span>
                        <strong className="uppercase text-gray-950 text-[9px] whitespace-normal break-words block">
                          {item.alunoNome}
                        </strong>
                      </div>
                      {item.codigoMatricula && (
                        <div className="text-right shrink-0">
                          <span className="text-[7px] font-bold uppercase text-gray-500 block">Matrícula</span>
                          <strong className="font-mono text-gray-900 text-[8px]">{item.codigoMatricula}</strong>
                        </div>
                      )}
                    </div>

                    {item.classeTurma && (
                      <div className="text-[8px] text-gray-700 whitespace-normal break-words">
                        <span className="font-semibold">Classe / Turma:</span>{' '}
                        <strong className="text-gray-950">{item.classeTurma}</strong>
                      </div>
                    )}

                    <div className="text-[8.5px] text-gray-800 whitespace-normal break-words">
                      <span className="font-semibold">Descrição:</span>{' '}
                      <strong className="text-gray-950">{item.descricao}</strong>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[8px] text-gray-700 pt-0.5">
                      <span>
                        Método: <strong className="text-gray-900">{item.metodoPagamento || 'Numerário'}</strong>
                        {item.numeroComprovativo ? ` (Comp: ${item.numeroComprovativo})` : ''}
                      </span>
                      <span>
                        Data: <strong className="text-gray-900">{formatarDataHoraAngolana(item.dataHora)}</strong>
                      </span>
                    </div>

                    <div className="mt-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between">
                      <span className="text-[8px] font-bold uppercase text-emerald-900">
                        Total Pago{item.multaKz && item.multaKz > 0 ? ` (incl. multa ${item.multaKz.toLocaleString('pt-AO')} Kz)` : ''}:
                      </span>
                      <strong className="text-[10.5px] font-black font-mono text-emerald-950">
                        {(item.valorTotalKz || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </strong>
                    </div>
                  </div>

                  {/* Rodapé: A Direcção da Escola (Título -> Linha -> Nome do Atendente) + QR Limpo */}
                  <div className="pt-1.5 border-t border-gray-200 flex items-end justify-between gap-2">
                    <div className="flex-1 flex flex-col items-center justify-end text-center min-w-0">
                      <span className="text-[7.5px] font-bold uppercase text-gray-800 leading-tight">
                        A Direcção da Escola
                      </span>
                      <div className="w-40 max-w-full border-b border-black my-3.5" />
                      <span className="text-[7.5px] font-bold text-gray-950 whitespace-normal break-words leading-tight">
                        {nomeAtendente}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      <OfficialQrCode
                        value={gerarPayloadQrDocumento({
                          docType: 'RECIBO_EMOLUMENTO',
                          escolaId: escola.id,
                          docRef: item.numeroRecibo,
                          alunoId: item.alunoId || item.id,
                          alunoNome: item.alunoNome,
                          anoLectivo: escola.anoLectivoActivo || ''
                        })}
                        size={40}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

interface FeeReceiptsA4ModalProps {
  isOpen: boolean;
  onClose: () => void;
  escola: Escola;
  todosRecibos: ReciboEmolumentoA4Item[];
  initialSelectedIds?: string[];
  nomeAtendentePadrao?: string;
}

export const FeeReceiptsA4Modal: React.FC<FeeReceiptsA4ModalProps> = ({
  isOpen,
  onClose,
  escola,
  todosRecibos,
  initialSelectedIds,
  nomeAtendentePadrao = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return initialSelectedIds;
    }
    return todosRecibos.slice(0, 8).map((r) => r.id);
  });
  const [gerandoPdf, setGerandoPdf] = useState(false);

  if (!isOpen) return null;

  const recibosFiltrados = todosRecibos.filter((r) => {
    if (!searchTerm.trim()) return true;
    return (
      safeSearchMatch(r.alunoNome, searchTerm) ||
      safeSearchMatch(r.numeroRecibo, searchTerm) ||
      safeSearchMatch(r.descricao, searchTerm) ||
      safeSearchMatch(r.codigoMatricula, searchTerm)
    );
  });

  const recibosSelecionados = todosRecibos.filter((r) => selectedIds.includes(r.id));

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selecionarPrimeirosOito = () => {
    setSelectedIds(recibosFiltrados.slice(0, 8).map((r) => r.id));
  };

  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    try {
      await downloadElementAsPdf(
        'modal-recibos-emolumentos-a4-grid',
        `Recibos_Emolumentos_8porA4_${escola.sigla || 'ESCOLA'}`,
        {
          orientation: 'portrait',
          format: 'a4',
          margins: { top: 8, right: 8, bottom: 12, left: 8 }
        }
      );
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleImprimir = () => {
    const el = document.getElementById('modal-recibos-emolumentos-a4-grid');
    if (el) {
      imprimirElementoDiretamente(
        el,
        `Recibos de Emolumentos (8 por A4) - ${escola.nomeOficial}`,
        {
          orientation: 'portrait',
          format: 'a4',
          margins: { top: 8, right: 8, bottom: 12, left: 8 }
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-3 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-gray-200 flex flex-col max-h-[94vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Emissão em Folha A4 — 8 Recibos de Emolumentos por Folha
              </h3>
              <p className="text-xs text-gray-500">
                Selecione os recibos desejados ({recibosSelecionados.length} selecionados •{' '}
                {Math.max(1, Math.ceil(recibosSelecionados.length / 8))} folha(s) A4).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={gerandoPdf || recibosSelecionados.length === 0}
              onClick={handleBaixarPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{gerandoPdf ? 'A gerar PDF...' : 'Baixar PDF (8/Folha A4)'}</span>
            </button>
            <button
              type="button"
              disabled={recibosSelecionados.length === 0}
              onClick={handleImprimir}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Corpo Modal: Seleção lateral + Preview A4 */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Painel Seleção */}
          <div className="lg:col-span-4 border-r border-gray-200 p-4 flex flex-col bg-gray-50 overflow-y-auto max-h-[75vh]">
            <div className="relative mb-3">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar estudante ou recibo..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={selecionarPrimeirosOito}
                className="flex-1 py-1.5 px-2.5 bg-white border border-gray-300 hover:bg-emerald-50 text-gray-800 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                Selecionar 8 Recibos
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="py-1.5 px-2.5 bg-white border border-gray-300 hover:bg-rose-50 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                Limpar
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1">
              {recibosFiltrados.map((r) => {
                const marcado = selectedIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleId(r.id)}
                    className={`w-full text-left p-2 rounded-lg border text-xs flex items-start space-x-2 transition-colors cursor-pointer ${
                      marcado
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {marcado ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-[10px]">N.º {r.numeroRecibo}</span>
                        <span className="font-mono font-black text-[10px] text-emerald-800">
                          {(r.valorTotalKz || 0).toLocaleString('pt-AO')} Kz
                        </span>
                      </div>
                      <p className="font-bold truncate">{r.alunoNome}</p>
                      <p className="text-[10px] text-gray-500 truncate">{r.descricao}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Folha A4 (8 por folha) */}
          <div className="lg:col-span-8 p-4 overflow-y-auto max-h-[75vh] bg-slate-200">
            <FeeReceiptsA4Grid
              escola={escola}
              recibos={recibosSelecionados}
              nomeAtendentePadrao={nomeAtendentePadrao}
              gridId="modal-recibos-emolumentos-a4-grid"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
