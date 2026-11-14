import React, { useState, useEffect } from 'react';
import { Download, Printer, Users, X, User } from 'lucide-react';
import { Escola, Turma, Aluno } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { OfficialQrCode, gerarPayloadQrDocumento } from '../utils/qrCodeUtils';
import { isSegundoCiclo } from '../services/academicHierarchyService';
import { downloadElementAsPdf } from '../utils/pdfGenerator';
import { formatarParaDataAngola } from './AngolaDateInput';
import { dbService } from '../services/storage';

interface StudentClassListPdfDocumentProps {
  escola: Escola;
  turma: Turma;
  alunos: Aluno[];
  onClose?: () => void;
}

export function calcularIdadeAluno(dataNascIsoOuStr?: string): string {
  if (!dataNascIsoOuStr) return '—';
  let ano = 0, mes = 0, dia = 0;
  if (dataNascIsoOuStr.includes('-')) {
    const p = dataNascIsoOuStr.split('-');
    if (p[0].length === 4) {
      ano = parseInt(p[0], 10);
      mes = parseInt(p[1], 10);
      dia = parseInt(p[2], 10);
    }
  } else if (dataNascIsoOuStr.includes('/')) {
    const p = dataNascIsoOuStr.split('/');
    if (p[2]?.length === 4) {
      ano = parseInt(p[2], 10);
      mes = parseInt(p[1], 10);
      dia = parseInt(p[0], 10);
    }
  }
  if (!ano || isNaN(ano)) return '—';
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() + 1 - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }
  return `${Math.max(0, idade)} anos`;
}

export const StudentClassListPdfDocument: React.FC<StudentClassListPdfDocumentProps> = ({
  escola,
  turma,
  alunos,
  onClose
}) => {
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [configSistema, setConfigSistema] = useState(() => dbService.getConfiguracaoSistema());

  useEffect(() => {
    const atualizar = () => setConfigSistema(dbService.getConfiguracaoSistema());
    window.addEventListener('sge_dados_atualizados_remoto', atualizar);
    return () => window.removeEventListener('sge_dados_atualizados_remoto', atualizar);
  }, []);

  // Ordenar alunos por número de chamada ou nome
  const alunosOrdenados = [...alunos].sort((a, b) => {
    if (a.numeroOrdem && b.numeroOrdem) return a.numeroOrdem - b.numeroOrdem;
    return a.nomeCompleto.localeCompare(b.nomeCompleto);
  });

  const totalAlunos = alunosOrdenados.length;
  const totalM = alunosOrdenados.filter(a => a.genero === 'M').length;
  const totalF = alunosOrdenados.filter(a => a.genero === 'F').length;

  // Regra Oficial do Ministério da Educação de Angola:
  // No Ensino Primário e I Ciclo no lugar de curso NÃO deve ter nada, porque a estes níveis não há cursos.
  const temCurso = isSegundoCiclo(turma.classe);
  const cursoExibicao = temCurso ? (turma.curso || 'Geral') : '';

  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    try {
      const nomeLimpo = `lista_nominal_${turma.classe}_${turma.nome.replace(/\s+/g, '_')}_${turma.anoLectivo.replace(/\//g, '-')}.pdf`;
      await downloadElementAsPdf('documento-lista-nominal-alunos', nomeLimpo, {
        orientation: 'portrait',
        format: 'a4',
        marginMm: 8
      });
    } catch (e) {
      console.error('Falha ao gerar PDF da lista nominal:', e);
      window.print();
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-md no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Lista Nominal Oficial da Turma (com Fotos, Sexo e Idade)</h3>
            <p className="text-xs text-slate-300">
              {turma.classe} • Turma {turma.nome} {temCurso ? `• Curso: ${cursoExibicao}` : ''} • {totalAlunos} Alunos ({totalM} M, {totalF} F)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleImprimir}
            className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleBaixarPdf}
            disabled={gerandoPdf}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{gerandoPdf ? 'A Gerar PDF...' : 'Baixar Lista em PDF (.pdf)'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Folha Oficial A4 para Impressão e PDF */}
      <div 
        id="documento-lista-nominal-alunos"
        className="bg-white p-6 sm:p-8 border border-gray-300 rounded-xl shadow-lg max-w-[210mm] mx-auto text-black print:border-none print:shadow-none print:p-0 print:m-0"
        style={{ minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}
      >
        {/* Cabeçalho Oficial do Ministério da Educação da República de Angola */}
        <div className="text-center space-y-1 mb-5">
          <div className="flex justify-center mb-1">
            <InsigniaAngola size={50} customUrl={configSistema.insigniaNacionalUrl} />
          </div>
          <h1 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            República de Angola
          </h1>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            Governo Provincial de {escola.provincia || 'Luanda'}
          </h2>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            {escola.municipio ? `Administração Municipal de ${escola.municipio}` : 'Direcção Municipal da Educação'}
          </h3>
          <h4 className="text-sm font-black uppercase text-blue-950 pt-0.5">
            {escola.nomeOficial}
          </h4>
          <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-400 rounded text-xs font-black uppercase tracking-wider mt-1">
            Lista Nominal dos Alunos Matriculados
          </div>
        </div>

        {/* Metadados da Turma em Grid Limpo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-gray-50 border border-gray-300 rounded text-[11px] mb-4">
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Ano Lectivo</span>
            <span className="font-black text-gray-900">{turma.anoLectivo}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Classe</span>
            <span className="font-black text-gray-900">{turma.classe}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Turma / Turno</span>
            <span className="font-black text-gray-900">{turma.nome} ({turma.turno})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Sala</span>
            <span className="font-black text-gray-900">{turma.sala || 'Sala de Aula'}</span>
          </div>

          {/* Regra Oficial: Apenas no 2º Ciclo exibe o curso. No Primário e 1º Ciclo NÃO há curso */}
          {temCurso && cursoExibicao && (
            <div className="col-span-2 sm:col-span-4 border-t border-gray-200 pt-1 mt-1">
              <span className="text-gray-500 text-[9px] uppercase font-bold inline-block mr-1">Curso / Especialidade:</span>
              <span className="font-black text-blue-900 text-[11px]">{cursoExibicao}</span>
            </div>
          )}
        </div>

        {/* Tabela Nominal com Numeração, Fotografia, Nome Completo, Sexo e Idade */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse border border-black text-[10px] text-left">
            <thead>
              <tr className="bg-gray-200 text-black uppercase font-black text-[9px] border-b-2 border-black">
                <th className="p-1.5 border border-black text-center w-8">Nº</th>
                <th className="p-1 border border-black text-center w-12">Foto</th>
                <th className="p-1.5 border border-black text-center w-20">Nº Proc.</th>
                <th className="p-1.5 border border-black">Nome Completo do(a) Estudante</th>
                <th className="p-1.5 border border-black text-center w-12">Sexo</th>
                <th className="p-1.5 border border-black text-center w-16">Idade</th>
                <th className="p-1.5 border border-black text-center w-24">Data Nasc.</th>
                <th className="p-1.5 border border-black text-center w-28">Assinatura / Obs.</th>
              </tr>
            </thead>
            <tbody>
              {alunosOrdenados.map((aluno, idx) => {
                const idade = calcularIdadeAluno(aluno.dataNascimento);
                const dataFormatada = formatarParaDataAngola(aluno.dataNascimento);

                return (
                  <tr key={aluno.id} className="border-b border-black hover:bg-gray-50">
                    <td className="p-1 border border-black text-center font-bold font-mono">
                      {idx + 1}
                    </td>

                    {/* Fotografia 3x4 em miniatura de alta definição */}
                    <td className="p-1 border border-black text-center">
                      <div className="w-9 h-11 mx-auto bg-gray-100 border border-gray-400 rounded overflow-hidden flex items-center justify-center">
                        {aluno.fotoUrl ? (
                          <img 
                            src={aluno.fotoUrl} 
                            alt={aluno.nomeCompleto} 
                            className="w-full h-full object-cover" 
                            crossOrigin="anonymous" 
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <User className="w-5 h-5 text-gray-300" />
                            <span className="text-[6px] text-gray-400 font-bold uppercase">Foto</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-1 border border-black text-center font-mono font-medium text-[9px]">
                      {aluno.numeroProcesso || aluno.codigoMatricula}
                    </td>

                    <td className="p-1.5 border border-black font-bold uppercase text-[10.5px]">
                      {aluno.nomeCompleto}
                    </td>

                    <td className="p-1 border border-black text-center font-bold">
                      {aluno.genero === 'M' ? 'M' : 'F'}
                    </td>

                    <td className="p-1 border border-black text-center font-medium">
                      {idade}
                    </td>

                    <td className="p-1 border border-black text-center font-mono text-[9px]">
                      {dataFormatada || '—'}
                    </td>

                    <td className="p-1 border border-black text-center text-gray-400 text-[8px]">
                      {aluno.estado || 'Activo'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resumo Estatístico da Turma */}
        <div className="flex justify-between items-center p-2 bg-gray-100 border border-black rounded text-[10px] font-bold mb-8">
          <span>Total de Alunos Matriculados: <strong className="font-black text-black">{totalAlunos}</strong></span>
          <span>Masculino: <strong className="font-black text-black">{totalM}</strong></span>
          <span>Feminino: <strong className="font-black text-black">{totalF}</strong></span>
          <span>Data de Emissão: <strong className="font-black text-black">{new Date().toLocaleDateString('pt-AO')}</strong></span>
        </div>

        {/* Assinaturas Oficiais com Traço Centrado e Gênero Correto */}
        <div className="grid grid-cols-3 gap-4 pt-4 text-center text-[10px]">
          <div>
            <p className="font-bold text-gray-900 mb-8">O(A) Director(a) de Turma</p>
            <div className="w-40 border-b border-black mx-auto mb-1" />
            <p className="font-bold text-gray-900">{turma.coordenadorNome || 'Coordenação de Turma'}</p>
            <p className="text-gray-500 text-[9px]">Docente Responsável</p>
          </div>

          <div>
            <p className="font-bold text-gray-900 mb-8">
              {escola.subdiretorPedagogicoNome ? 'O Subdirector Pedagógico' : 'A Subdirecção Pedagógica'}
            </p>
            <div className="w-40 border-b border-black mx-auto mb-1" />
            <p className="font-bold text-gray-900">{escola.subdiretorPedagogicoNome || 'Subdirecção Pedagógica'}</p>
            <p className="text-gray-500 text-[9px]">Área Pedagógica</p>
          </div>

          <div>
            <p className="font-bold text-gray-900 mb-8">
              {escola.diretorGeralGenero === 'F' ? 'A Directora Geral' : 'O Director Geral'}
            </p>
            <div className="w-40 border-b border-black mx-auto mb-1" />
            <p className="font-bold text-gray-900">{escola.diretorGeralNome || 'Direcção da Escola'}</p>
            <p className="text-gray-500 text-[9px]">Visto & Homologado</p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-gray-300 flex items-center justify-between text-[9px] text-gray-600">
          <div>
            <p className="font-bold text-gray-800">Documento Oficial • Sistema de Gestão Escolar MED</p>
            <p>Turma {turma.nome} ({turma.classe}) • {totalAlunos} estudantes listados</p>
          </div>
          <OfficialQrCode
            value={gerarPayloadQrDocumento({
              docType: 'LISTA_NOMINAL',
              escolaId: escola.id,
              docRef: `${turma.id}-${turma.anoLectivo}`,
              turmaId: turma.id,
              anoLectivo: turma.anoLectivo
            })}
            size={48}
            label="Validar Lista"
          />
        </div>
      </div>
    </div>
  );
};
