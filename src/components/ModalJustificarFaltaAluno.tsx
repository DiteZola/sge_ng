import React, { useState } from 'react';
import { ShieldCheck, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Aluno, Turma, Funcionario, PresencaAlunoItem } from '../types';
import { AngolaDateInput } from './AngolaDateInput';
import { dbService } from '../services/storage';

interface ModalJustificarFaltaAlunoProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: Aluno;
  turma?: Turma;
  dataFaltaInicial?: string;
  currentUser: Funcionario;
  escolaId: string;
  onSalvo?: () => void;
}

export const MOTIVOS_JUSTIFICACAO_ALUNO = [
  'Atestado Médico / Doença Comprovada',
  'Comunicação Escrita do Encarregado de Educação',
  'Falecimento de Familiar Próximo (Luto)',
  'Representação Oficial da Escola (Desporto / Olimpíada)',
  'Consulta Médica Especializada / Exames Clínicos',
  'Força Maior / Intempéries / Dificuldade Extrema de Transporte',
  'Outro Motivo Atendido pela Direção Pedagógica'
];

export const ModalJustificarFaltaAluno: React.FC<ModalJustificarFaltaAlunoProps> = ({
  isOpen,
  onClose,
  aluno,
  turma,
  dataFaltaInicial,
  currentUser,
  escolaId,
  onSalvo
}) => {
  const [dataFalta, setDataFalta] = useState<string>(() => dataFaltaInicial || new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_JUSTIFICACAO_ALUNO[0]);
  const [descricao, setDescricao] = useState<string>('');
  const [documentoRef, setDocumentoRef] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataFalta) {
      setErro('Por favor, informe a data da falta.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Por favor, indique a descrição da justificativa.');
      return;
    }

    const justificativaCompleta = `[${motivo.toUpperCase()}] ${descricao.trim()}${documentoRef ? ` (Comprovativo: ${documentoRef.trim()})` : ''} - Averbado por: ${currentUser.nomeCompleto} em ${new Date().toLocaleDateString('pt-AO')}`;

    const presencaItem: PresencaAlunoItem = {
      id: `pres-${aluno.id}-${dataFalta}`,
      escolaId,
      turmaId: aluno.turmaId || turma?.id || '',
      alunoId: aluno.id,
      data: dataFalta,
      estado: 'Falta_Justificada',
      justificativa: justificativaCompleta,
      registadoPorId: currentUser.id,
      registadoPorNome: currentUser.nomeCompleto
    };

    dbService.salvarPresencaAluno(presencaItem);

    // Também registar ocorrência positiva de regularização de falta no histórico do aluno
    try {
      dbService.adicionarOcorrenciaHistoricoAluno(aluno.id, {
        data: dataFalta,
        tipo: 'Outro',
        descricao: `Justificação de Falta Homologada: ${motivo}. ${descricao.trim()}`,
        registadoPor: currentUser.nomeCompleto,
        cargo: currentUser.cargo || 'Coordenação Pedagógica',
        anoLectivo: turma?.anoLectivo || '2025/2026',
        classe: turma?.classe || aluno.classeId || 'Classe',
        resolucao: 'Falta convertida oficialmente para Falta Justificada (FJ).'
      });
    } catch {}

    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
      if (onSalvo) onSalvo();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-sm">Justificar Falta de Estudante</h3>
              <p className="text-[11px] text-blue-200">Averbamento oficial no livro de presenças e assiduidade</p>
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
          {/* Dados do Estudante */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-700 uppercase font-black tracking-wider block">Estudante</span>
              <span className="font-bold text-gray-900 text-sm">{aluno.nomeCompleto}</span>
              <span className="text-gray-600 block text-[11px]">
                Proc: {aluno.numeroProcesso || aluno.codigoMatricula} {turma ? `• Turma: ${turma.nome} (${turma.classe})` : ''}
              </span>
            </div>
            <span className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px]">
              Falta a Justificar
            </span>
          </div>

          {erro && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 rounded-lg flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Falta do estudante justificada com sucesso no livro de presenças!</span>
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
              <label className="font-semibold text-gray-700 block mb-1">
                Motivo da Justificação <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-medium"
              >
                {MOTIVOS_JUSTIFICACAO_ALUNO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700 block mb-1">
              Documento Comprovativo / Declaração
            </label>
            <input
              type="text"
              placeholder="Ex: Atestado Médico nº 109 / Declaração assinada pelo encarregado Sr. João..."
              value={documentoRef}
              onChange={(e) => setDocumentoRef(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 block mb-1">
              Descrição Circunstanciada <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Detalhes apresentados pelo encarregado de educação ou comprovados por documento oficial..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Averbar Falta Justificada (FJ)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
