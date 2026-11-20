import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  Scissors,
  Search,
  UserPlus,
  Trash2,
  CheckCircle2,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { Aluno, Escola, Funcionario, Turma } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { downloadElementAsPdf, imprimirElementoDiretamente } from '../utils/pdfGenerator';
import { formatarDataHoraAngolana } from '../utils/dateFormat';
import {
  CLASSES_ENSINO_PRIMARIO,
  CLASSES_PRIMEIRO_CICLO,
  CLASSES_SEGUNDO_CICLO,
  CURSOS_SEGUNDO_CICLO,
  isSegundoCiclo,
  normalizarClasse
} from '../services/academicHierarchyService';
import { dbService } from '../services/storage';
import { obterNomeDiretorGeral } from '../utils/directorHelper';
import { safeSearchMatch } from '../utils/securitySanitizer';

export interface ReciboMatriculaSlot {
  slotIndex: number;
  tipoOperacao: 'Matricula' | 'Confirmacao';
  alunoId?: string;
  nomeCompleto: string;
  codigoMatricula: string;
  numeroProcesso: string;
  documentoId: string;
  classeAnterior?: string;
  classe: string;
  turmaNome: string;
  sala: string;
  turno: string;
  curso: string;
  anoLectivo: string;
  encarregadoNome: string;
  encarregadoTelefone: string;
  valorTaxa?: string;
  dataEmissao: string;
  atendenteNome?: string;
}

interface EnrollmentReceiptSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  escola: Escola;
  alunos: Aluno[];
  turmas: Turma[];
  currentUser?: Funcionario;
  initialSlots?: Partial<ReciboMatriculaSlot>[];
}

const TODAS_CLASSES_OPT = [
  'Iniciação',
  ...CLASSES_ENSINO_PRIMARIO.filter(c => c !== 'Iniciação'),
  ...CLASSES_PRIMEIRO_CICLO,
  ...CLASSES_SEGUNDO_CICLO
];

export const criarSlotVazio = (
  slotIndex: number,
  anoLectivo: string,
  tipoPadrao: 'Matricula' | 'Confirmacao' = 'Matricula'
): ReciboMatriculaSlot => ({
  slotIndex,
  tipoOperacao: tipoPadrao,
  alunoId: undefined,
  nomeCompleto: '',
  codigoMatricula: '',
  numeroProcesso: '',
  documentoId: '',
  classeAnterior: '',
  classe: '',
  turmaNome: '',
  sala: '',
  turno: 'Manhã',
  curso: '',
  anoLectivo,
  encarregadoNome: '',
  encarregadoTelefone: '',
  valorTaxa: 'Regularizada',
  dataEmissao: new Date().toISOString()
});

export const converterAlunoParaSlot = (
  aluno: Aluno,
  turmas: Turma[],
  escola: Escola,
  slotIndex: number,
  tipoOperacao: 'Matricula' | 'Confirmacao',
  classeAnterior?: string,
  atendenteNome?: string
): ReciboMatriculaSlot => {
  const turma = turmas.find(t => t.id === aluno.turmaId);
  const classeNorm = normalizarClasse(aluno.classeId || turma?.classe || '1ª');
  const turnoLabel =
    turma?.turno ||
    (aluno.periodo === 'Matinal'
      ? 'Manhã'
      : aluno.periodo === 'Vespertino'
      ? 'Tarde'
      : aluno.periodo === 'Noturno'
      ? 'Noite'
      : aluno.periodo || 'Manhã');

  return {
    slotIndex,
    tipoOperacao,
    alunoId: aluno.id,
    nomeCompleto: aluno.nomeCompleto,
    codigoMatricula: aluno.codigoMatricula || '—',
    numeroProcesso: aluno.numeroProcesso || aluno.codigoMatricula || '—',
    documentoId: aluno.numeroDocumento || aluno.numeroBI || '—',
    classeAnterior: classeAnterior || '',
    classe: classeNorm,
    turmaNome: turma?.nome || 'Turma Atribuída',
    sala: turma?.sala || '01',
    turno: turnoLabel,
    curso: isSegundoCiclo(classeNorm) ? aluno.curso || turma?.curso || '' : '',
    anoLectivo: aluno.anoLectivo || aluno.anoMatricula || turma?.anoLectivo || escola.anoLectivoActivo || '',
    encarregadoNome: aluno.nomeEncarregado || aluno.encarregadoNome || '—',
    encarregadoTelefone: aluno.telefoneEncarregado || aluno.encarregadoTelefone || aluno.telefone || '—',
    valorTaxa: aluno.propinaStatus || 'Regularizada',
    dataEmissao: new Date().toISOString(),
    atendenteNome: atendenteNome || undefined
  };
};

export const EnrollmentReceiptSheetModal: React.FC<EnrollmentReceiptSheetModalProps> = ({
  isOpen,
  onClose,
  escola,
  alunos,
  turmas,
  currentUser,
  initialSlots
}) => {
  const anoPadrao = escola.anoLectivoActivo || '';
  const [configSistema] = useState(() => dbService.getConfiguracaoSistema());
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [slotFocadoSugestao, setSlotFocadoSugestao] = useState<number | null>(null);

  const construirSlotsIniciais = (): ReciboMatriculaSlot[] => {
    const base: ReciboMatriculaSlot[] = [
      criarSlotVazio(0, anoPadrao, 'Confirmacao'),
      criarSlotVazio(1, anoPadrao, 'Confirmacao'),
      criarSlotVazio(2, anoPadrao, 'Confirmacao')
    ];
    if (initialSlots && initialSlots.length > 0) {
      for (let i = 0; i < Math.min(3, initialSlots.length); i++) {
        const s = initialSlots[i];
        if (s) {
          base[i] = {
            ...base[i],
            ...s,
            slotIndex: i,
            anoLectivo: s.anoLectivo || anoPadrao,
            dataEmissao: s.dataEmissao || new Date().toISOString()
          };
        }
      }
      const tipoDominante = base[0].tipoOperacao || 'Confirmacao';
      for (let i = 1; i < 3; i++) {
        if (!initialSlots[i]) {
          base[i].tipoOperacao = tipoDominante;
        }
      }
    }
    return base;
  };

  const [slots, setSlots] = useState<ReciboMatriculaSlot[]>(construirSlotsIniciais);

  useEffect(() => {
    if (isOpen) {
      setSlots(construirSlotsIniciais());
      setSlotFocadoSugestao(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSlots]);

  const cursosDisponiveis = useMemo(() => {
    const fromCfg = dbService.getCursos(escola.id).map(c => c.nome).filter(Boolean);
    const fromTurmas = turmas
      .filter(t => isSegundoCiclo(t.classe) && t.curso)
      .map(t => t.curso!)
      .filter(Boolean);
    return Array.from(new Set([...fromCfg, ...fromTurmas, ...CURSOS_SEGUNDO_CICLO]));
  }, [escola.id, turmas]);

  const turnosDisponiveis = useMemo(() => {
    const fromCfg = dbService
      .getTurnosConfigs(escola.id)
      .filter(t => t.ativo !== false)
      .map(t => t.nome)
      .filter(Boolean);
    const fromTurmas = turmas.map(t => t.turno).filter(Boolean);
    return Array.from(new Set([...fromCfg, ...fromTurmas, 'Manhã', 'Tarde', 'Noite']));
  }, [escola.id, turmas]);

  const turmasDoAnoAtivo = useMemo(() => {
    if (!anoPadrao) return turmas;
    const filtradas = turmas.filter(t => !t.anoLectivo || t.anoLectivo === anoPadrao);
    return filtradas.length > 0 ? filtradas : turmas;
  }, [turmas, anoPadrao]);

  const slotsAtivos = useMemo(() => {
    return slots.filter(s => s.nomeCompleto.trim().length > 0);
  }, [slots]);

  const atualizarSlot = (idx: number, patch: Partial<ReciboMatriculaSlot>) => {
    setSlots(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const selecionarAlunoNoSlot = (idx: number, aluno: Aluno) => {
    const atual = slots[idx];
    const convertido = converterAlunoParaSlot(
      aluno,
      turmas,
      escola,
      idx,
      atual.tipoOperacao,
      atual.classeAnterior,
      currentUser?.nomeCompleto
    );
    setSlots(prev => prev.map((s, i) => (i === idx ? convertido : s)));
    setSlotFocadoSugestao(null);
  };

  const limparSlot = (idx: number) => {
    setSlots(prev =>
      prev.map((s, i) => (i === idx ? criarSlotVazio(idx, anoPadrao, s.tipoOperacao) : s))
    );
  };

  const handleBaixarPdfA4 = async () => {
    const el = document.getElementById('folha-recibos-matricula-a4');
    if (!el) return;
    setGerandoPdf(true);
    try {
      const sufixo =
        slotsAtivos.length === 1
          ? slotsAtivos[0].nomeCompleto.replace(/\s+/g, '_')
          : `Lote_${slotsAtivos.length}_Recibos_A4`;
      await downloadElementAsPdf(el, `Recibo_Matricula_${sufixo}`, {
        format: 'a4',
        orientation: 'portrait',
        margins: { top: 6, right: 6, bottom: 6, left: 6 },
        scale: 2.3
      });
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleImprimirA4 = () => {
    const el = document.getElementById('folha-recibos-matricula-a4');
    if (!el) {
      window.print();
      return;
    }
    imprimirElementoDiretamente(el, 'Recibos de Matrícula e Confirmação (3 por Folha A4)', {
      format: 'a4',
      orientation: 'portrait',
      margins: { top: 6, right: 6, bottom: 6, left: 6 }
    });
  };

  if (!isOpen) return null;

  const nomeFuncionarioOperador = currentUser?.nomeCompleto || obterNomeDiretorGeral(escola);

  return (
    <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-4 max-h-[95vh] overflow-y-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-200 no-print">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Recibos de Matrícula e Confirmação — 3 por Folha A4
              </h3>
              <p className="text-xs text-gray-500">
                Insira até <strong>3 nomes de alunos</strong> (selecionando alunos cadastrados ou digitando livremente) para baixar todos em uma única folha A4.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={gerandoPdf || slotsAtivos.length === 0}
              onClick={handleBaixarPdfA4}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>
                {gerandoPdf
                  ? 'A gerar Folha A4...'
                  : `Baixar Folha A4 (${slotsAtivos.length} ${slotsAtivos.length === 1 ? 'Recibo' : 'Recibos'} PDF)`}
              </span>
            </button>
            <button
              type="button"
              disabled={slotsAtivos.length === 0}
              onClick={handleImprimirA4}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir Folha A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Painel de Inserção dos 3 Nomes (Slots 1, 2 e 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
          {slots.map((slot, idx) => {
            const sugestoes = slot.nomeCompleto.trim()
              ? alunos
                  .filter(
                    a =>
                      safeSearchMatch(a.nomeCompleto, slot.nomeCompleto) ||
                      safeSearchMatch(a.codigoMatricula, slot.nomeCompleto) ||
                      safeSearchMatch(a.numeroBI || a.numeroDocumento, slot.nomeCompleto)
                  )
                  .slice(0, 6)
              : alunos.slice(0, 5);

            const preenchido = slot.nomeCompleto.trim().length > 0;

            return (
              <div
                key={`slot-editor-${idx}`}
                className={`p-3 rounded-xl border-2 space-y-2 transition-colors ${
                  preenchido ? 'border-emerald-400 bg-emerald-50/40' : 'border-dashed border-gray-300 bg-gray-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-gray-800 flex items-center space-x-1">
                    <UserPlus className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Recibo {idx + 1} de 3</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={slot.tipoOperacao}
                      onChange={e =>
                        atualizarSlot(idx, {
                          tipoOperacao: e.target.value as 'Matricula' | 'Confirmacao'
                        })
                      }
                      className="text-[10px] font-bold px-1.5 py-0.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="Confirmacao">Confirmação</option>
                      <option value="Matricula">Matrícula</option>
                    </select>
                    {preenchido && (
                      <button
                        type="button"
                        onClick={() => limparSlot(idx)}
                        className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                        title="Limpar este recibo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Campo de Nome com Autocompletar */}
                <div className="relative">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={slot.nomeCompleto}
                      onFocus={() => setSlotFocadoSugestao(idx)}
                      onBlur={() => setTimeout(() => setSlotFocadoSugestao(prev => (prev === idx ? null : prev)), 180)}
                      onChange={e => {
                        const val = e.target.value;
                        atualizarSlot(idx, {
                          nomeCompleto: val,
                          alunoId: undefined,
                          codigoMatricula:
                            slot.codigoMatricula ||
                            (val.trim()
                              ? `${anoPadrao ? anoPadrao.split('/')[0] : new Date().getFullYear()}/MED-${1000 + idx * 111}`
                              : '')
                        });
                        setSlotFocadoSugestao(idx);
                      }}
                      placeholder={`Inserir nome do ${idx + 1}º aluno...`}
                      className="w-full pl-7 pr-2 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  {slotFocadoSugestao === idx && sugestoes.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                      {sugestoes.map(al => {
                        const t = turmas.find(tm => tm.id === al.turmaId);
                        return (
                          <button
                            key={`sug-${idx}-${al.id}`}
                            type="button"
                            onMouseDown={ev => {
                              ev.preventDefault();
                              selecionarAlunoNoSlot(idx, al);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-[11px] flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-bold text-gray-900 truncate pr-2">{al.nomeCompleto}</span>
                            <span className="text-[10px] font-mono text-emerald-700 shrink-0">
                              {al.classeId || t?.classe || ''} • {t?.nome || ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Campos Rápidos */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <select
                    value={slot.classe}
                    onChange={e => {
                      const novaCls = e.target.value;
                      const tMatch = turmasDoAnoAtivo.find(
                        t => normalizarClasse(t.classe) === normalizarClasse(novaCls)
                      );
                      atualizarSlot(idx, {
                        classe: novaCls,
                        turmaNome: tMatch?.nome || slot.turmaNome,
                        sala: tMatch?.sala || slot.sala,
                        turno: tMatch?.turno || slot.turno,
                        curso: isSegundoCiclo(novaCls) ? tMatch?.curso || slot.curso : ''
                      });
                    }}
                    className="p-1.5 border border-gray-300 rounded bg-white font-semibold"
                  >
                    <option value="">Classe...</option>
                    {TODAS_CLASSES_OPT.map(c => (
                      <option key={`cls-slot-${idx}-${c}`} value={c}>
                        {c === 'Iniciação' ? 'Iniciação' : `${c} Classe`}
                      </option>
                    ))}
                  </select>

                  <select
                    value={slot.turno}
                    onChange={e => atualizarSlot(idx, { turno: e.target.value })}
                    className="p-1.5 border border-gray-300 rounded bg-white"
                  >
                    {turnosDisponiveis.map(tr => (
                      <option key={`trn-slot-${idx}-${tr}`} value={tr}>
                        {tr}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={slot.turmaNome}
                    onChange={e => atualizarSlot(idx, { turmaNome: e.target.value })}
                    placeholder="Turma (ex: 8ª A)"
                    className="p-1.5 border border-gray-300 rounded bg-white"
                  />

                  <input
                    type="text"
                    value={slot.codigoMatricula}
                    onChange={e => atualizarSlot(idx, { codigoMatricula: e.target.value })}
                    placeholder="Nº Matrícula"
                    className="p-1.5 border border-gray-300 rounded bg-white font-mono"
                  />

                  {isSegundoCiclo(slot.classe) && (
                    <select
                      value={slot.curso}
                      onChange={e => atualizarSlot(idx, { curso: e.target.value })}
                      className="col-span-2 p-1.5 border border-purple-300 rounded bg-purple-50/40 font-semibold text-purple-900"
                    >
                      <option value="">Selecionar Curso (IIº Ciclo)...</option>
                      {cursosDisponiveis.map(cur => (
                        <option key={`cur-slot-${idx}-${cur}`} value={cur}>
                          {cur}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Informação sobre aproveitamento da folha */}
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Folha A4 (3 em 1):</strong> Cada recibo ocupa 1/3 da folha A4 com guias de corte. Preencha 1, 2 ou 3 nomes acima e clique em <strong>Baixar Folha A4</strong>.
            </span>
          </div>
          <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200 shrink-0">
            {slotsAtivos.length} / 3 preenchidos
          </span>
        </div>

        {/* Pré-visualização da Folha A4 (exact width 794px, centrada) */}
        <div className="border border-gray-300 rounded-xl p-3 bg-gray-100 overflow-x-auto">
          {slotsAtivos.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center text-gray-500 border-2 border-dashed border-gray-300">
              <CheckCircle2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">Insira pelo menos 1 nome acima para gerar o recibo.</p>
              <p className="text-xs text-gray-500 mt-1">
                Pode inserir até 3 nomes diferentes para imprimir os 3 recibos na mesma folha A4.
              </p>
            </div>
          ) : (
            <div
              id="folha-recibos-matricula-a4"
              data-passes-page="true"
              className="mx-auto bg-white text-black shadow-sm"
              style={{
                width: '794px',
                minHeight: '1050px',
                padding: '8px 12px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                gap: '4px'
              }}
            >
              {slotsAtivos.map((slot, renderIdx) => {
                const ehConfirmacao = slot.tipoOperacao === 'Confirmacao';
                const mostrarCurso = isSegundoCiclo(slot.classe) && Boolean(slot.curso?.trim());

                return (
                  <React.Fragment key={`recibo-a4-${slot.slotIndex}`}>
                    {/* Cartão de 1/3 de Folha A4 (altura adaptável a partir de 320px) */}
                    <div
                      className="border-2 border-gray-900 rounded-lg bg-white text-gray-950 font-sans flex flex-col justify-between"
                      style={{
                        minHeight: '320px',
                        padding: '8px 12px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Cabeçalho Compacto MED */}
                      <div className="flex items-center justify-between border-b-2 border-gray-900 pb-1.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="shrink-0">
                            {configSistema.insigniaNacionalUrl && configSistema.insigniaNacionalUrl.trim() !== '' ? (
                              <img
                                src={configSistema.insigniaNacionalUrl}
                                alt="Insígnia da República de Angola"
                                className="h-9 w-9 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <InsigniaAngola size={34} />
                            )}
                          </div>
                          <div className="leading-tight">
                            <p className="text-[8.5px] font-black uppercase tracking-wider text-gray-800">
                              República de Angola • {escola.governoProvincial || `Governo Provincial de ${escola.provincia || 'Luanda'}`}
                            </p>
                            <p className="text-[8px] font-bold uppercase text-gray-600">
                              {escola.gabineteEducacao || 'Gabinete Provincial da Educação'}
                            </p>
                            <h4 className="text-[12px] font-black uppercase text-gray-950">
                              {escola.nomeOficial}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 border border-gray-900 rounded ${
                              ehConfirmacao ? 'bg-emerald-50 text-emerald-950' : 'bg-blue-50 text-blue-950'
                            }`}
                          >
                            {ehConfirmacao ? 'RECIBO DE CONFIRMAÇÃO DE MATRÍCULA' : 'RECIBO DE MATRÍCULA'}
                          </span>
                          <p className="text-[9.5px] font-bold text-gray-800 mt-0.5">
                            Ano Lectivo: <span className="font-black">{slot.anoLectivo || '—'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Corpo do Recibo */}
                      <div className="grid grid-cols-12 gap-3 py-1.5 text-[10.5px] leading-snug">
                        {/* Coluna Esquerda: Identificação do Estudante */}
                        <div className="col-span-7 space-y-1 border-r border-gray-200 pr-2.5">
                          <div className="bg-gray-100 border border-gray-300 px-2.5 py-1 rounded flex items-center justify-between">
                            <div>
                              <span className="text-[8.5px] uppercase font-bold text-gray-600 block">
                                N.º Oficial de Matrícula
                              </span>
                              <strong className="text-xs font-mono font-black text-blue-950">
                                {slot.codigoMatricula || '—'}
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[8.5px] uppercase font-bold text-gray-600 block">
                                N.º de Processo
                              </span>
                              <strong className="text-[11px] font-mono font-bold text-gray-900">
                                {slot.numeroProcesso || slot.codigoMatricula || '—'}
                              </strong>
                            </div>
                          </div>

                          <p>
                            <span className="text-gray-600 font-semibold">Nome do Estudante: </span>
                            <strong className="uppercase text-gray-950 text-[11px]">{slot.nomeCompleto}</strong>
                          </p>
                          <p>
                            <span className="text-gray-600 font-semibold">Documento (BI / Cédula): </span>
                            <strong className="font-mono">{slot.documentoId || '—'}</strong>
                          </p>
                          <p className="whitespace-normal break-words">
                            <span className="text-gray-600 font-semibold">Encarregado(a): </span>
                            <strong>{slot.encarregadoNome || '—'}</strong>
                            {slot.encarregadoTelefone && slot.encarregadoTelefone !== '—'
                              ? ` (${slot.encarregadoTelefone})`
                              : ''}
                          </p>
                        </div>

                        {/* Coluna Direita: Enquadramento Escolar */}
                        <div className="col-span-5 bg-gray-50 border border-gray-200 rounded p-2 space-y-1 min-w-0">
                          {ehConfirmacao && slot.classeAnterior && (
                            <p className="text-[10px]">
                              <span className="text-gray-500 font-semibold">Classe Anterior: </span>
                              <strong>
                                {slot.classeAnterior === 'Iniciação'
                                  ? 'Iniciação'
                                  : `${slot.classeAnterior} Classe`}
                              </strong>
                            </p>
                          )}
                          <p>
                            <span className="text-gray-600 font-semibold">
                              {ehConfirmacao ? 'Classe Confirmada: ' : 'Classe Matriculada: '}
                            </span>
                            <strong className="text-emerald-900 font-black">
                              {slot.classe
                                ? slot.classe === 'Iniciação'
                                  ? 'Iniciação'
                                  : `${slot.classe} Classe`
                                : '—'}
                            </strong>
                          </p>
                          <p>
                            <span className="text-gray-600 font-semibold">Turma & Sala: </span>
                            <strong>
                              {slot.turmaNome || '—'}
                              {slot.sala ? ` (Sala ${slot.sala})` : ''}
                            </strong>
                          </p>
                          <p>
                            <span className="text-gray-600 font-semibold">Turno: </span>
                            <strong>{slot.turno || 'Manhã'}</strong>
                          </p>
                          {mostrarCurso && (
                            <p className="whitespace-normal break-words">
                              <span className="text-gray-600 font-semibold">Curso: </span>
                              <strong className="text-purple-950">{slot.curso}</strong>
                            </p>
                          )}
                          <p>
                            <span className="text-gray-600 font-semibold">Situação / Taxa: </span>
                            <strong className="text-emerald-800">{slot.valorTaxa || 'Regularizada'}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Rodapé: Assinaturas (Título em cima -> Linha -> Nome por baixo) + QR Code */}
                      <div className="border-t border-gray-300 pt-1.5">
                        <div className="grid grid-cols-3 gap-3 items-end text-center text-[9.5px]">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800">O(A) Encarregado(a) de Educação</p>
                            <div className="w-full max-w-[160px] border-b border-black mx-auto mt-5 mb-0.5" />
                            <p className="text-[9px] font-semibold text-gray-800 whitespace-normal break-words">
                              {slot.encarregadoNome && slot.encarregadoNome !== '—'
                                ? slot.encarregadoNome
                                : ' '}
                            </p>
                          </div>

                          <div className="flex flex-col items-center justify-center">
                            <OfficialQrCode
                              value={gerarPayloadQrDocumento({
                                docType: ehConfirmacao ? 'COMPROVATIVO_CONFIRMACAO' : 'COMPROVATIVO_MATRICULA',
                                escolaId: escola.id,
                                docRef: slot.codigoMatricula || slot.nomeCompleto,
                                alunoId: slot.alunoId || `manual-${slot.slotIndex}`,
                                alunoNome: slot.nomeCompleto,
                                anoLectivo: slot.anoLectivo
                              })}
                              size={42}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-gray-800">A Direcção da Escola</p>
                            <div className="w-full max-w-[160px] border-b border-black mx-auto mt-5 mb-0.5" />
                            <p className="text-[9px] font-semibold text-gray-800 whitespace-normal break-words">
                              {slot.atendenteNome || nomeFuncionarioOperador}
                            </p>
                          </div>
                        </div>

                        <div className="text-center text-[8px] text-gray-500 mt-1">
                          Emitido aos {formatarDataHoraAngolana(slot.dataEmissao)}
                          {escola.municipio || escola.provincia
                            ? ` • ${[escola.municipio, escola.provincia].filter(Boolean).join(', ')}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    {/* Linha de corte entre recibos */}
                    {renderIdx < slotsAtivos.length - 1 && (
                      <div className="flex items-center justify-center space-x-2 text-[8.5px] text-gray-400 select-none py-0.5">
                        <Scissors className="h-3 w-3 shrink-0" />
                        <span className="border-b border-dashed border-gray-400 flex-1" />
                        <span className="uppercase tracking-widest font-semibold">Recortar aqui</span>
                        <span className="border-b border-dashed border-gray-400 flex-1" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
