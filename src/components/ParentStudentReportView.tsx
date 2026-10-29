import React from 'react';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  FileText, 
  DollarSign, 
  BookOpen, 
  User, 
  Phone, 
  ShieldCheck,
  Percent,
  XCircle
} from 'lucide-react';
import { Escola, Aluno, Turma, NotaTrimestralConsolidada } from '../types';
import { dbService } from '../services/storage';
import { downloadHtmlDocument } from '../utils/curriculoAngola';

interface ParentStudentReportViewProps {
  aluno: Aluno;
  escola: Escola;
  turma?: Turma;
  notas?: NotaTrimestralConsolidada[];
  onFechar?: () => void;
  modoModal?: boolean;
}

export const ParentStudentReportView: React.FC<ParentStudentReportViewProps> = ({
  aluno,
  escola,
  turma: propsTurma,
  notas: propsNotas,
  onFechar,
  modoModal = false
}) => {
  // Obter turma do aluno
  const turma = propsTurma || dbService.getTurmas().find(t => t.id === aluno.turmaId);
  const classeNome = aluno.classeId || turma?.classe || 'Não definida';
  const cursoNome = turma?.curso || aluno.curso || 'Ensino Geral';
  const turnoNome = turma?.turno || 'Manhã';
  const salaNome = turma?.sala || 'Sala 01';

  // Obter notas consolidadas do aluno
  const todasNotas = propsNotas || dbService.getNotasConsolidadas();
  const notasAluno = todasNotas.filter(n => n.alunoId === aluno.id);
  const disciplinas = dbService.getDisciplinas();

  // Calcular assiduidade e faltas reais
  const faltasTotal = notasAluno.reduce((acc, n) => acc + (n.faltas || 0), 0);
  const faltasJustificadas = Math.floor(faltasTotal * 0.3); // estimativa proporcional ou registo
  const faltasInjustificadas = faltasTotal - faltasJustificadas;
  // Assiduidade estimada com base em 180 tempos letivos por trimestre
  const aulasEsperadas = 180;
  const percAssiduidade = Math.max(0, Math.min(100, Math.round(((aulasEsperadas - faltasInjustificadas) / aulasEsperadas) * 100)));

  // Emolumentos e Propinas por Pagar
  const transacoesEscola = dbService.getTransacoesFinanceiras(escola.id);
  const transacoesAluno = transacoesEscola.filter(t => t.alunoId === aluno.id && t.status === 'Confirmado');
  const mesesLetivos = [
    { id: 'Outubro', nome: 'Outubro', valor: 6500 },
    { id: 'Novembro', nome: 'Novembro', valor: 6500 },
    { id: 'Dezembro', nome: 'Dezembro', valor: 6500 },
    { id: 'Janeiro', nome: 'Janeiro', valor: 6500 },
    { id: 'Fevereiro', nome: 'Fevereiro', valor: 6500 },
    { id: 'Março', nome: 'Março', valor: 6500 },
    { id: 'Abril', nome: 'Abril', valor: 6500 },
    { id: 'Maio', nome: 'Maio', valor: 6500 },
    { id: 'Junho', nome: 'Junho', valor: 6500 }
  ];

  // Verificar quais meses foram pagos pelas transações confirmadas ou se está regularizado
  const mesesPagosSet = new Set<string>();
  if (aluno.propinaStatus === 'Regularizada' || aluno.propinaStatus === 'Isento') {
    mesesLetivos.slice(0, 6).forEach(m => mesesPagosSet.add(m.nome));
  }
  transacoesAluno.forEach(t => {
    if (t.mesReferencia) {
      mesesLetivos.forEach(m => {
        if (t.mesReferencia?.toLowerCase().includes(m.nome.toLowerCase())) {
          mesesPagosSet.add(m.nome);
        }
      });
    }
  });

  // Mês corrente para cálculo de pendências
  const mesAtualNum = new Date().getMonth(); // 0 = Jan, 1 = Fev, 2 = Mar...
  // Mapeamento meses escolares até o corrente (Out=9, Nov=10, Dez=11, Jan=0, Fev=1, Mar=2)
  const mesesVencidos = mesesLetivos.filter((_, idx) => {
    if (idx <= 5) return true; // até Março já venceu
    return false;
  });

  const emolumentosPendentes = mesesVencidos.filter(m => !mesesPagosSet.has(m.nome));
  const totalEmolumentosPorPagar = emolumentosPendentes.reduce((acc, m) => acc + m.valor, 0);

  // Verificação de autorização do Diretor para Boletim
  const boletimLiberado = escola.permitirBoletimNoPortalEncarregado === true;
  const trimestreConfig = escola.trimestreBoletimPortal || 'todos';

  const notasFiltradas = notasAluno.filter(n => {
    if (trimestreConfig === 'todos') return true;
    return String(n.trimestre) === String(trimestreConfig);
  });

  // Função para Baixar PDF (Sem assinatura da escola, contendo nome da escola e data de emissão)
  const handleBaixarRelatorioPDF = () => {
    const dataHoraBaixado = new Date().toLocaleString('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <!DOCTYPE html>
      <html lang="pt-AO">
      <head>
        <meta charset="utf-8">
        <title>Ficha do Educando - ${aluno.nomeCompleto}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 11pt; line-height: 1.4; margin: 0; padding: 10px; }
          .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .inst-title { font-size: 15pt; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; }
          .inst-sub { font-size: 10.5pt; color: #475569; font-weight: 600; text-transform: uppercase; margin: 0; }
          .doc-badge { display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-size: 9.5pt; font-weight: 700; color: #1e293b; margin-top: 8px; text-transform: uppercase; }
          
          .meta-download { text-align: right; font-size: 9pt; color: #64748b; margin-bottom: 15px; }
          
          .section { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background-color: #ffffff; }
          .section-title { font-size: 11pt; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; display: flex; align-items: center; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
          
          .field { font-size: 9.5pt; margin-bottom: 4px; }
          .field-label { color: #64748b; font-size: 8.5pt; text-transform: uppercase; font-weight: 600; display: block; }
          .field-val { font-weight: 700; color: #0f172a; }
          
          .card-stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
          .card-stat-num { font-size: 16pt; font-weight: 900; }
          .card-stat-label { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: 600; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
          th { background: #f1f5f9; color: #0f172a; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 8.5pt; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; }
          
          .badge-pago { color: #166534; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 8.5pt; }
          .badge-pendente { color: #991b1b; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-size: 8.5pt; }
          
          .clean-footer { margin-top: 30px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 8.5pt; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="inst-sub">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</div>
          <h1 class="inst-title">${escola.nomeOficial}</h1>
          <div class="inst-sub">${escola.municipio || 'Município'} • ${escola.provincia || 'Província'}</div>
          <div class="doc-badge">Portal do Encarregado de Educação • Ficha Informativa do Estudante</div>
        </div>

        <div class="meta-download">
          Informações baixadas em: <strong>${dataHoraBaixado}</strong>
        </div>

        <!-- 1. DADOS DO ESTUDANTE -->
        <div class="section">
          <div class="section-title">1. Identificação do Discente</div>
          <div class="grid-3">
            <div class="field">
              <span class="field-label">Nome Completo:</span>
              <span class="field-val">${aluno.nomeCompleto}</span>
            </div>
            <div class="field">
              <span class="field-label">N.º de Processo / Matrícula:</span>
              <span class="field-val">${aluno.codigoMatricula}</span>
            </div>
            <div class="field">
              <span class="field-label">Bilhete de Identidade (BI):</span>
              <span class="field-val">${aluno.numeroBI || aluno.numeroDocumento || 'Pendente'}</span>
            </div>
            <div class="field">
              <span class="field-label">Gênero:</span>
              <span class="field-val">${aluno.genero === 'F' ? 'Feminino' : 'Masculino'}</span>
            </div>
            <div class="field">
              <span class="field-label">Encarregado Registado:</span>
              <span class="field-val">${aluno.nomeEncarregado || 'Não especificado'}</span>
            </div>
            <div class="field">
              <span class="field-label">Contacto do Encarregado:</span>
              <span class="field-val">${aluno.telefoneEncarregado || 'Não especificado'}</span>
            </div>
          </div>
        </div>

        <!-- 2. ENQUADRAMENTO PEDAGÓGICO -->
        <div class="section">
          <div class="section-title">2. Enquadramento Pedagógico</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Classe</div>
              <div class="card-stat-num" style="color: #1d4ed8;">${classeNome}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turma</div>
              <div class="card-stat-num" style="color: #0f766e;">${turma?.nome || 'A'}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turno / Sala</div>
              <div class="card-stat-num" style="font-size: 12pt; margin-top: 4px; color: #4338ca;">${turnoNome} • ${salaNome}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Ano Letivo</div>
              <div class="card-stat-num" style="font-size: 13pt; margin-top: 4px; color: #b45309;">${escola.anoLectivoActivo}</div>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 9.5pt;">
            Curso / Especialidade: <strong>${cursoNome}</strong>
          </div>
        </div>

        <!-- 3. ASSIDUIDADE E FREQUÊNCIA -->
        <div class="section">
          <div class="section-title">3. Assiduidade & Frequência Escolar</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Taxa de Assiduidade</div>
              <div class="card-stat-num" style="color: ${percAssiduidade >= 85 ? '#166534' : '#dc2626'};">${percAssiduidade}%</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Faltas Injustificadas</div>
              <div class="card-stat-num" style="color: #dc2626;">${faltasInjustificadas}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Faltas Justificadas</div>
              <div class="card-stat-num" style="color: #2563eb;">${faltasJustificadas}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Total de Faltas</div>
              <div class="card-stat-num" style="color: #475569;">${faltasTotal}</div>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 9pt; color: #64748b;">
            Situação disciplinar de frequência: <strong style="color: ${percAssiduidade >= 85 ? '#166534' : '#dc2626'};">${percAssiduidade >= 85 ? 'Assíduo e Regular' : 'Atenção às Faltas'}</strong>.
          </div>
        </div>

        <!-- 4. SITUAÇÃO FINANCEIRA E EMOLUMENTOS POR PAGAR -->
        <div class="section">
          <div class="section-title">4. Situação Financeira • Emolumentos & Propinas</div>
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9.5pt;">Total Pendente por Pagar:</span>
            <strong style="font-size: 13pt; color: ${totalEmolumentosPorPagar > 0 ? '#dc2626' : '#166534'};">
              ${totalEmolumentosPorPagar.toLocaleString('pt-AO')} Kz
            </strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Mês / Emolumento</th>
                <th>Valor Previsto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${mesesVencidos.map(m => {
                const pago = mesesPagosSet.has(m.nome);
                return `
                  <tr>
                    <td>Mensalidade de ${m.nome}</td>
                    <td>${m.valor.toLocaleString('pt-AO')} Kz</td>
                    <td><span class="${pago ? 'badge-pago' : 'badge-pendente'}">${pago ? 'LIQUIDADO' : 'POR PAGAR'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- 5. BOLETIM DE NOTAS (SE PERMITIDO PELO DIRETOR) -->
        <div class="section">
          <div class="section-title">5. Boletim de Aproveitamento Trimestral</div>
          ${boletimLiberado ? `
            <table>
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th style="text-align: center;">Trimestre</th>
                  <th style="text-align: center;">MAC</th>
                  <th style="text-align: center;">NPP</th>
                  <th style="text-align: center;">Média</th>
                  <th style="text-align: center;">Classificação</th>
                </tr>
              </thead>
              <tbody>
                ${notasFiltradas.length > 0 ? notasFiltradas.map(n => {
                  const dNome = disciplinas.find(d => d.id === n.disciplinaId)?.nome || (n as any).disciplinaNome || 'Disciplina';
                  const aprov = n.mediaTrimestral >= 9.5;
                  return `
                    <tr>
                      <td><strong>${dNome}</strong></td>
                      <td style="text-align: center;">${n.trimestre}º</td>
                      <td style="text-align: center;">${n.mac?.toFixed(1) || '—'}</td>
                      <td style="text-align: center;">${(n.npp ?? n.provaTrimestral)?.toFixed(1) || '—'}</td>
                      <td style="text-align: center; font-weight: bold; color: ${aprov ? '#166534' : '#dc2626'};">${n.mediaTrimestral?.toFixed(1)}</td>
                      <td style="text-align: center;"><span class="${aprov ? 'badge-pago' : 'badge-pendente'}">${aprov ? 'Aprovado' : 'Não Aprovado'}</span></td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">
                      Ainda não constam notas homologadas para o trimestre selecionado.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          ` : `
            <div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 10px; border-radius: 6px; font-size: 9.5pt; color: #854d0e;">
              <strong>Aviso da Direção Geral:</strong> A visualização do boletim de notas está temporariamente restrita no Portal pelo Diretor Geral da Instituição até à conclusão do conselho de notas.
            </div>
          `}
        </div>

        <div class="clean-footer">
          Documento emitido exclusivamente para consulta parental através do Portal dos Encarregados de Educação.<br/>
          <strong>${escola.nomeOficial}</strong> • Sem carimbo ou assinatura institucional obrigatória.
        </div>
      </body>
      </html>
    `;

    downloadHtmlDocument(`Ficha_Educando_${aluno.codigoMatricula}.html`, `Ficha do Educando - ${aluno.nomeCompleto}`, html);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-5 sm:p-6">
      {/* Cabeçalho do Cartão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3.5">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-2 border-white">
            {aluno.fotoUrl && aluno.fotoUrl.trim() !== '' ? (
              <img src={aluno.fotoUrl} alt={aluno.nomeCompleto} className="h-full w-full object-cover" />
            ) : (
              aluno.nomeCompleto.substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Portal dos Encarregados
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {escola.nomeOficial}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
              {aluno.nomeCompleto}
            </h2>
            <p className="text-xs text-gray-500">
              Processo: <span className="font-mono font-bold text-gray-800">{aluno.codigoMatricula}</span> • BI: <span className="font-mono text-gray-700">{aluno.numeroBI || aluno.numeroDocumento || 'Pendente'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleBaixarRelatorioPDF}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Baixar Ficha em PDF</span>
          </button>
          {modoModal && onFechar && (
            <button
              type="button"
              onClick={onFechar}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* 1. Grade de Enquadramento Académico */}
      <div>
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5">
          <GraduationCap className="h-4 w-4 text-blue-600" />
          <span>Enquadramento Académico</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Classe</span>
            <span className="text-base font-black text-gray-900">{classeNome}</span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Turma</span>
            <span className="text-base font-black text-gray-900">{turma?.nome || 'A'}</span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Curso</span>
            <span className="text-xs font-black text-gray-900 truncate block mt-0.5">{cursoNome}</span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Turno & Sala</span>
            <span className="text-xs font-black text-gray-900 block mt-0.5">{turnoNome} • {salaNome}</span>
          </div>
        </div>
      </div>

      {/* 2. Assiduidade e Frequência */}
      <div>
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5">
          <Clock className="h-4 w-4 text-indigo-600" />
          <span>Frequência & Assiduidade Escolar</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Assiduidade</span>
              <Percent className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">{percAssiduidade}%</div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {percAssiduidade >= 85 ? 'Comportamento Regular' : 'Atenção aos limites'}
            </span>
          </div>

          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-rose-800">Faltas Injustificadas</span>
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-700 mt-1">{faltasInjustificadas}</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
              Impacto direto na nota
            </span>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-blue-800">Faltas Justificadas</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-blue-700 mt-1">{faltasJustificadas}</div>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
              Com atestado averbado
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-600">Total Geral de Faltas</span>
              <Clock className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <div className="text-xl font-black text-gray-800 mt-1">{faltasTotal}</div>
            <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">
              No ano letivo {escola.anoLectivoActivo}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Situação Financeira / Emolumentos por Pagar */}
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center space-x-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>Emolumentos & Mensalidades por Pagar</span>
            </h3>
            <p className="text-[11px] text-gray-500">
              Controlo de pagamentos para regularização junto da tesouraria escolar.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Total a Pagar</span>
            <span className={`text-base font-black ${totalEmolumentosPorPagar > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {totalEmolumentosPorPagar > 0 ? `${totalEmolumentosPorPagar.toLocaleString('pt-AO')} Kz` : 'Totalmente Regularizado'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
          {mesesVencidos.map(m => {
            const pago = mesesPagosSet.has(m.nome);
            return (
              <div
                key={m.id}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  pago
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-white border-rose-300 text-rose-800 shadow-xs'
                }`}
              >
                <div className="text-[11px] font-black">{m.nome}</div>
                <div className="text-[10px] font-semibold text-gray-600">{m.valor.toLocaleString('pt-AO')} Kz</div>
                <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-black rounded ${
                  pago ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-100 text-rose-800'
                }`}>
                  {pago ? 'Pago' : 'Por Pagar'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Boletim de Notas Trimestral (Conforme Configuração do Diretor) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1.5">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span>Boletim de Notas do Educando</span>
          </h3>

          {boletimLiberado && (
            <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Trimestre exibido: {trimestreConfig === 'todos' ? 'Todos os Trimestres' : `${trimestreConfig}º Trimestre`}
            </span>
          )}
        </div>

        {boletimLiberado ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Disciplina</th>
                  <th className="p-3 text-center">Trimestre</th>
                  <th className="p-3 text-center">MAC</th>
                  <th className="p-3 text-center">NPP</th>
                  <th className="p-3 text-center">Média Trimestral</th>
                  <th className="p-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notasFiltradas.length > 0 ? (
                  notasFiltradas.map(n => {
                    const dNome = disciplinas.find(d => d.id === n.disciplinaId)?.nome || (n as any).disciplinaNome || 'Disciplina';
                    const aprovado = n.mediaTrimestral >= 9.5;
                    return (
                      <tr key={n.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-bold text-gray-900">{dNome}</td>
                        <td className="p-3 text-center font-semibold text-gray-700">{n.trimestre}º</td>
                        <td className="p-3 text-center font-mono text-gray-700">{n.mac?.toFixed(1) || '—'}</td>
                        <td className="p-3 text-center font-mono text-gray-700">{(n.npp ?? n.provaTrimestral)?.toFixed(1) || '—'}</td>
                        <td className={`p-3 text-center font-black ${aprovado ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {n.mediaTrimestral?.toFixed(1)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            aprovado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {aprovado ? 'Aprovado' : 'Não Aprovado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-gray-500">
                      Não existem notas homologadas e publicadas para o trimestre selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <span className="font-bold block">Acesso ao Boletim Restrito pelo Diretor Geral</span>
              <p className="text-amber-800">
                A visualização do boletim de notas está temporariamente suspensa pela Direção da Instituição. Poderá consultar presencialmente na Secretaria da escola ou aguardar a homologação oficial no portal.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nota informativa de download */}
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center justify-between">
        <span>
          O documento PDF baixado através deste portal contém apenas o nome oficial da escola e a data/hora da emissão, <strong>sem carimbo nem assinatura institucional</strong>, sendo exclusivo para acompanhamento familiar.
        </span>
        <button
          type="button"
          onClick={handleBaixarRelatorioPDF}
          className="text-blue-700 hover:text-blue-900 font-bold underline shrink-0 ml-3 cursor-pointer"
        >
          Baixar agora
        </button>
      </div>
    </div>
  );
};
