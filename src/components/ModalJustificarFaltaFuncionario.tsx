import React, { useState } from 'react';
import { ShieldCheck, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Funcionario, RegistoAssiduidade } from '../types';
import { AngolaDateInput } from './AngolaDateInput';

interface ModalJustificarFaltaFuncionarioProps {
  isOpen: boolean;
  onClose: () => void;
  funcionario: Funcionario;
  dataFaltaInicial?: string;
  currentUser: Funcionario;
  escolaId: string;
  onSalvar: (registo: RegistoAssiduidade) => void;
}

export const MOTIVOS_JUSTIFICACAO_FUNCIONARIO = [
  'Atestado Médico / Licença de Saúde',
  'Falecimento de Familiar (Nojo)',
  'Casamento / Licença Nupcial',
  'Maternidade / Paternidade',
  'Missão de Serviço / Seminário / Formação Oficial',
  'Comparecimento a Tribunal / Ato Público Obrigatório',
  'Força Maior / Calamidade / Intempérie',
  'Outro Motivo Legalmente Atendido'
];

export const ModalJustificarFaltaFuncionario: React.FC<ModalJustificarFaltaFuncionarioProps> = ({
  isOpen,
  onClose,
  funcionario,
  dataFaltaInicial,
  currentUser,
  escolaId,
  onSalvar
}) => {
  const [dataFalta, setDataFalta] = useState<string>(() => dataFaltaInicial || new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_JUSTIFICACAO_FUNCIONARIO[0]);
  const [descricao, setDescricao] = useState<string>('');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [entidadeEmissora, setEntidadeEmissora] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataFalta) {
      setErro('Por favor, indique a data da falta a ser justificada.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Por favor, descreva sucintamente a justificativa.');
      return;
    }

    const justificativaCompleta = `[${motivo.toUpperCase()}] ${descricao.trim()}${numeroDocumento ? ` (Doc. Ref: ${numeroDocumento.trim()}${entidadeEmissora ? ` - ${entidadeEmissora.trim()}` : ''})` : ''} - Justificado por: ${currentUser.nomeCompleto} em ${new Date().toLocaleDateString('pt-AO')}`;

    const registo: RegistoAssiduidade = {
      id: `assid-${funcionario.id}-${dataFalta}`,
      funcionarioId: funcionario.id,
      funcionarioNome: funcionario.nomeCompleto,
      cargo: funcionario.cargo || 'Funcionário',
      escolaId,
      data: dataFalta,
      estado: 'Falta_Justificada',
      observacao: justificativaCompleta,
      justificativa: justificativaCompleta,
      registadoPor: currentUser.nomeCompleto
    };

    onSalvar(registo);
    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-sm">Justificar Falta de Funcionário</h3>
              <p className="text-[11px] text-emerald-200">Averbamento oficial no livro de ponto da instituição</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Dados do Funcionário */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider block">Colaborador / Docente</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm break-words">{funcionario.nomeCompleto}</span>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cargo: {funcionario.cargo} {funcionario.numeroAgente ? `• Agente: ${funcionario.numeroAgente}` : ''}</span>
            </div>
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg font-bold text-[10px] shrink-0">
              Falta a Regularizar
            </span>
          </div>

          {erro && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-lg flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-lg flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Falta justificada com sucesso no registo de ponto!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AngolaDateInput
              label="Data da Falta a Justificar"
              required
              value={dataFalta}
              onChange={(v) => {
                setDataFalta(v);
                setErro(null);
              }}
            />

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Motivo Oficial Legal <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                {MOTIVOS_JUSTIFICACAO_FUNCIONARIO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nº Documento / Atestado / Parecer
              </label>
              <input
                type="text"
                placeholder="Ex: Atestado Médico nº 452/2026"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Entidade / Hospital Emissor
              </label>
              <input
                type="text"
                placeholder="Ex: Hospital Geral de Luanda"
                value={entidadeEmissora}
                onChange={(e) => setEntidadeEmissora(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Descrição Circunstanciada do Pedido <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Descreva o motivo da ausência apresentado pelo funcionário e o despacho de deferimento da direção..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Averbar Justificação de Falta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
