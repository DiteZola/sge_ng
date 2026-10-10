import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Database, 
  Calendar, 
  Users, 
  Layers, 
  BookOpen, 
  ShieldCheck, 
  Download,
  X,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Aluno, Turma, Disciplina, Escola, AnoLectivoConfig } from '../types';
import { dbService } from '../services/storage';
import { downloadExcelFile } from '../utils/curriculoAngola';
import { normalizarClasse, CLASSES_ENSINO_PRIMARIO, CLASSES_PRIMEIRO_CICLO, CLASSES_SEGUNDO_CICLO } from '../services/academicHierarchyService';

interface ExcelSchoolDataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  escola: Escola;
  onImportacaoConcluida: (mensagem: string) => void;
}

interface SheetPreviewData {
  sheetName: string;
  rowCount: number;
  columns: string[];
  sampleRows: any[];
  tipoDetectado: 'Alunos' | 'Turmas' | 'Disciplinas' | 'AnoLectivo' | 'Outro';
  selecionado: boolean;
}

export const ExcelSchoolDataImportModal: React.FC<ExcelSchoolDataImportModalProps> = ({
  isOpen,
  onClose,
  escola,
  onImportacaoConcluida
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<SheetPreviewData[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [workbookRaw, setWorkbookRaw] = useState<XLSX.WorkBook | null>(null);

  // Configurações do Ano Letivo associado
  const [anoLetivoAlvo, setAnoLetivoAlvo] = useState(escola.anoLectivoActivo || '2025/2026');
  const [definirComoAtivo, setDefinirComoAtivo] = useState(true);
  const [dataInicioAno, setDataInicioAno] = useState('2025-09-01');
  const [dataFimAno, setDataFimAno] = useState('2026-07-31');

  // Confirmação e Validação de Tipos
  const [confirmouTiposDados, setConfirmouTiposDados] = useState(false);
  const [confirmouAnoLetivo, setConfirmouAnoLetivo] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isOpen) return null;

  // Carregar e processar ficheiro Excel (.xlsx / .xls)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setLoading(true);
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setFeedback(null);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      setWorkbookRaw(wb);

      const parsedSheets: SheetPreviewData[] = wb.SheetNames.map(sheetName => {
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(ws);
        const columns = json.length > 0 ? Object.keys(json[0]) : [];

        // Detectar tipo pelo nome da folha ou colunas
        const sLower = sheetName.toLowerCase();
        let tipoDetectado: SheetPreviewData['tipoDetectado'] = 'Outro';
        if (sLower.includes('alun') || sLower.includes('estudant') || columns.some(c => c.toLowerCase().includes('bi') || c.toLowerCase().includes('matricula'))) {
          tipoDetectado = 'Alunos';
        } else if (sLower.includes('turm') || columns.some(c => c.toLowerCase().includes('sala') || c.toLowerCase().includes('turno'))) {
          tipoDetectado = 'Turmas';
        } else if (sLower.includes('disc') || sLower.includes('matriz') || columns.some(c => c.toLowerCase().includes('carga') || c.toLowerCase().includes('sigla'))) {
          tipoDetectado = 'Disciplinas';
        } else if (sLower.includes('ano') || sLower.includes('calend') || columns.some(c => c.toLowerCase().includes('lectivo') || c.toLowerCase().includes('letivo'))) {
          tipoDetectado = 'AnoLectivo';
        }

        return {
          sheetName,
          rowCount: json.length,
          columns,
          sampleRows: json.slice(0, 15),
          tipoDetectado,
          selecionado: true
        };
      });

      setSheets(parsedSheets);

      // Se encontrou dados de Ano Letivo no Excel, sugerir
      const folhaAno = parsedSheets.find(s => s.tipoDetectado === 'AnoLectivo');
      if (folhaAno && folhaAno.sampleRows.length > 0) {
        const primeiro = folhaAno.sampleRows[0];
        const anoEncontrado = primeiro.AnoLectivo || primeiro.anoLectivo || primeiro.Ano || primeiro.ano;
        if (anoEncontrado) setAnoLetivoAlvo(String(anoEncontrado));
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setFeedback({ tipo: 'erro', texto: `Erro ao ler ficheiro Excel: ${err.message || 'Formato não reconhecido'}` });
      setLoading(false);
    }
  };

  // Alternar seleção de folha
  const handleToggleSheet = (index: number) => {
    setSheets(prev => prev.map((s, idx) => idx === index ? { ...s, selecionado: !s.selecionado } : s));
  };

  // Descarregar modelo oficial pré-formatado com várias folhas
  const handleBaixarModeloExemplo = () => {
    const wb = XLSX.utils.book_new();

    // 1. Folha Ano Lectivo
    const wsAno = XLSX.utils.json_to_sheet([
      {
        Rotulo: '2025/2026',
        DataInicio: '2025-09-01',
        DataFim: '2026-07-31',
        Estado: 'Aberto',
        Descricao: 'Ano Lectivo Oficial MED Angola'
      }
    ]);
    XLSX.utils.book_append_sheet(wb, wsAno, 'Ano_Lectivo');

    // 2. Folha Turmas
    const wsTurmas = XLSX.utils.json_to_sheet([
      { Nome: '7ª A', Classe: '7ª', NivelEnsino: 'ICiclo', Turno: 'Manhã', Sala: 'Sala 01', Capacidade: 45, AnoLectivo: '2025/2026', Curso: 'Geral' },
      { Nome: '10ª CFB-1', Classe: '10ª', NivelEnsino: 'IICiclo', Turno: 'Tarde', Sala: 'Sala 04', Capacidade: 40, AnoLectivo: '2025/2026', Curso: 'Ciências Físicas e Biológicas (PUNIV)' },
      { Nome: '1ª Primária A', Classe: '1ª', NivelEnsino: 'Primario', Turno: 'Manhã', Sala: 'Sala 02', Capacidade: 35, AnoLectivo: '2025/2026', Curso: 'Ensino Primário Geral' }
    ]);
    XLSX.utils.book_append_sheet(wb, wsTurmas, 'Turmas');

    // 3. Folha Alunos
    const wsAlunos = XLSX.utils.json_to_sheet([
      {
        NumeroOrdem: 1,
        CodigoMatricula: 'MED-2025-001',
        NomeCompleto: 'António Domingos Manuel',
        Genero: 'M',
        DataNascimento: '2010-04-12',
        BI: '005432198LA045',
        Naturalidade: 'Luanda',
        ProvinciaOrigem: 'Luanda',
        Telefone: '923456789',
        Encarregado: 'Manuel Domingos',
        TelefoneEncarregado: '912345678',
        Classe: '7ª',
        TurmaNome: '7ª A',
        Estado: 'Ativo'
      },
      {
        NumeroOrdem: 2,
        CodigoMatricula: 'MED-2025-002',
        NomeCompleto: 'Beatriz Teresa Kwanza',
        Genero: 'F',
        DataNascimento: '2008-09-23',
        BI: '008912345LA041',
        Naturalidade: 'Benguela',
        ProvinciaOrigem: 'Benguela',
        Telefone: '934567890',
        Encarregado: 'Teresa Kwanza',
        TelefoneEncarregado: '923112233',
        Classe: '10ª',
        TurmaNome: '10ª CFB-1',
        Estado: 'Ativo'
      }
    ]);
    XLSX.utils.book_append_sheet(wb, wsAlunos, 'Alunos');

    // 4. Folha Disciplinas
    const wsDisciplinas = XLSX.utils.json_to_sheet([
      { Nome: 'Língua Portuguesa', Sigla: 'LP', Codigo: 'LP-MED', CargaHoraria: 5, Componente: 'Geral', Classes: '7ª, 8ª, 9ª', Ciclo: 'Iº Ciclo' },
      { Nome: 'Matemática', Sigla: 'MAT', Codigo: 'MAT-MED', CargaHoraria: 5, Componente: 'Geral', Classes: '7ª, 8ª, 9ª', Ciclo: 'Iº Ciclo' },
      { Nome: 'Física', Sigla: 'FIS', Codigo: 'FIS-10', CargaHoraria: 4, Componente: 'Específica', Classes: '10ª, 11ª, 12ª', Ciclo: 'IIº Ciclo' },
      { Nome: 'Química', Sigla: 'QUI', Codigo: 'QUI-10', CargaHoraria: 4, Componente: 'Específica', Classes: '10ª, 11ª, 12ª', Ciclo: 'IIº Ciclo' }
    ]);
    XLSX.utils.book_append_sheet(wb, wsDisciplinas, 'Disciplinas');

    XLSX.writeFile(wb, 'Modelo_Oficial_Importacao_Escolar_MED_Angola.xlsx');
  };

  // Executar a importação definitiva e confirmação no sistema
  const handleConfirmarImportacao = () => {
    if (!workbookRaw || sheets.length === 0) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, selecione primeiro um ficheiro Excel válido.' });
      return;
    }

    if (!confirmouTiposDados) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, confirme a verificação dos tipos de dados antes de prosseguir.' });
      return;
    }

    setLoading(true);

    try {
      const escolaId = escola.id;
      let totalAlunos = 0;
      let totalTurmas = 0;
      let totalDisciplinas = 0;
      let anoLetivoCadastrado = false;

      // 1. Processar Folha Ano Lectivo
      const folhaAno = sheets.find(s => s.selecionado && s.tipoDetectado === 'AnoLectivo');
      if (folhaAno) {
        const ws = workbookRaw.Sheets[folhaAno.sheetName];
        const dataAno = XLSX.utils.sheet_to_json<any>(ws);
        if (dataAno.length > 0) {
          const item = dataAno[0];
          const rotulo = item.Rotulo || item.rotulo || anoLetivoAlvo;
          const novaConfigAno: AnoLectivoConfig = {
            id: `ano-${rotulo.replace(/\//g, '-')}`,
            rotulo: rotulo,
            dataInicio: item.DataInicio || item.dataInicio || dataInicioAno,
            dataFim: item.DataFim || item.dataFim || dataFimAno,
            estado: 'Aberto',
            trimestres: [
              { trimestre: '1º Trimestre', nome: 'Iº Trimestre', dataInicio: item.DataInicio || dataInicioAno, dataFim: '2025-12-15', estado: 'Aberto' },
              { trimestre: '2º Trimestre', nome: 'IIº Trimestre', dataInicio: '2026-01-05', dataFim: '2026-04-10', estado: 'Aberto' },
              { trimestre: '3º Trimestre', nome: 'IIIº Trimestre', dataInicio: '2026-04-20', dataFim: item.DataFim || dataFimAno, estado: 'Aberto' }
            ],
            criadoEm: new Date().toISOString(),
            descricao: 'Importado e Homologado via Folha Excel pelo Diretor'
          };
          dbService.salvarAnoLectivoConfig(novaConfigAno);
          anoLetivoCadastrado = true;
        }
      }

      // Se não tinha folha específica de ano letivo, garantir que o ano selecionado no modal é registrado
      if (!anoLetivoCadastrado && anoLetivoAlvo) {
        const anosExistentes = dbService.getAnosLectivos();
        if (!anosExistentes.includes(anoLetivoAlvo)) {
          const novaConfigAno: AnoLectivoConfig = {
            id: `ano-${anoLetivoAlvo.replace(/\//g, '-')}`,
            rotulo: anoLetivoAlvo,
            dataInicio: dataInicioAno,
            dataFim: dataFimAno,
            estado: 'Aberto',
            trimestres: [
              { trimestre: '1º Trimestre', nome: 'Iº Trimestre', dataInicio: dataInicioAno, dataFim: '2025-12-15', estado: 'Aberto' },
              { trimestre: '2º Trimestre', nome: 'IIº Trimestre', dataInicio: '2026-01-05', dataFim: '2026-04-10', estado: 'Aberto' },
              { trimestre: '3º Trimestre', nome: 'IIIº Trimestre', dataInicio: '2026-04-20', dataFim: dataFimAno, estado: 'Aberto' }
            ],
            criadoEm: new Date().toISOString(),
            descricao: 'Criado e Validado via Importador Excel Oficial'
          };
          dbService.salvarAnoLectivoConfig(novaConfigAno);
        }
      }

      // 2. Se marcado para definir como ano letivo ativo
      if (definirComoAtivo && anoLetivoAlvo) {
        const escolaAtualizada = { ...escola, anoLectivoActivo: anoLetivoAlvo };
        dbService.salvarEscola(escolaAtualizada);
      }

      // 3. Processar Turmas
      const folhaTurmas = sheets.find(s => s.selecionado && s.tipoDetectado === 'Turmas');
      const mapaTurmasCriadas: Record<string, string> = {}; // Nome da turma -> ID

      if (folhaTurmas) {
        const ws = workbookRaw.Sheets[folhaTurmas.sheetName];
        const dataTurmas = XLSX.utils.sheet_to_json<any>(ws);
        const turmasExistentes = dbService.getTurmas();

        for (const row of dataTurmas) {
          const nomeTurma = (row.Nome || row.nome || row.Turma || '').toString().trim();
          if (!nomeTurma) continue;

          const classe = normalizarClasse((row.Classe || row.classe || '7ª').toString());
          const nivel = row.NivelEnsino || row.nivelEnsino || (['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', 'Iniciação'].includes(classe) ? 'Primario' : ['7ª', '8ª', '9ª'].includes(classe) ? 'ICiclo' : 'IICiclo');
          const turno = (row.Turno || row.turno || 'Manhã') as any;
          const sala = (row.Sala || row.sala || 'Sala 01').toString();
          const capacidade = Number(row.Capacidade || row.capacidade || 45);
          const curso = (row.Curso || row.curso || (['10ª', '11ª', '12ª', '13ª'].includes(classe) ? 'Ciências Físicas e Biológicas (PUNIV)' : 'Geral')).toString();

          const idTurma = `turma-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const novaTurma: Turma = {
            id: idTurma,
            escolaId,
            nome: nomeTurma,
            classe,
            nivelEnsino: nivel as any,
            turno,
            sala,
            capacidade,
            anoLectivo: anoLetivoAlvo,
            curso
          };

          const idx = turmasExistentes.findIndex(t => t.nome.toLowerCase() === nomeTurma.toLowerCase() && t.anoLectivo === anoLetivoAlvo);
          if (idx >= 0) {
            turmasExistentes[idx] = { ...turmasExistentes[idx], ...novaTurma, id: turmasExistentes[idx].id };
            mapaTurmasCriadas[nomeTurma.toLowerCase()] = turmasExistentes[idx].id;
          } else {
            turmasExistentes.push(novaTurma);
            mapaTurmasCriadas[nomeTurma.toLowerCase()] = idTurma;
          }
          totalTurmas++;
        }
        dbService.salvarTurmas(turmasExistentes);
      }

      // 4. Processar Alunos
      const folhaAlunos = sheets.find(s => s.selecionado && s.tipoDetectado === 'Alunos');
      if (folhaAlunos) {
        const ws = workbookRaw.Sheets[folhaAlunos.sheetName];
        const dataAlunos = XLSX.utils.sheet_to_json<any>(ws);
        const alunosExistentes = dbService.getAlunos();
        const turmasDisponiveis = dbService.getTurmas();

        for (const row of dataAlunos) {
          const nomeAluno = (row.NomeCompleto || row.nomeCompleto || row.Nome || row.nome || '').toString().trim();
          if (!nomeAluno) continue;

          const classe = normalizarClasse((row.Classe || row.classe || '7ª').toString());
          const turmaNome = (row.TurmaNome || row.turmaNome || row.Turma || row.turma || '').toString().trim();

          // Encontrar turma ID correspondente
          let turmaId = mapaTurmasCriadas[turmaNome.toLowerCase()];
          if (!turmaId) {
            const encontrada = turmasDisponiveis.find(t => t.nome.toLowerCase() === turmaNome.toLowerCase());
            turmaId = encontrada ? encontrada.id : turmasDisponiveis[0]?.id || 'turma-padrao';
          }

          const novoAluno: Aluno = {
            id: `aluno-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            escolaId,
            codigoMatricula: (row.CodigoMatricula || row.codigoMatricula || `MED-${Date.now()}`).toString(),
            numeroOrdem: Number(row.NumeroOrdem || row.numeroOrdem || totalAlunos + 1),
            nomeCompleto: nomeAluno,
            genero: (row.Genero || row.genero || 'M').toString().toUpperCase().startsWith('F') ? 'F' : 'M',
            dataNascimento: (row.DataNascimento || row.dataNascimento || '2012-01-01').toString(),
            naturalidade: (row.Naturalidade || row.naturalidade || 'Luanda').toString(),
            provinciaOrigem: (row.ProvinciaOrigem || row.provinciaOrigem || 'Luanda').toString(),
            numeroBI: (row.BI || row.numeroBI || '000000000LA000').toString(),
            telefone: (row.Telefone || row.telefone || '').toString(),
            fotoUrl: (row.Foto || row.fotoUrl || '').toString(),
            encarregadoNome: (row.Encarregado || row.encarregadoNome || 'Encarregado de Educação').toString(),
            encarregadoParentesco: 'Encarregado',
            encarregadoTelefone: (row.TelefoneEncarregado || row.encarregadoTelefone || '').toString(),
            estado: 'Ativo',
            turmaId,
            classeId: classe,
            propinaStatus: 'Regularizada',
            historicoAnterior: [],
            cadastradoEm: new Date().toISOString().split('T')[0]
          };

          const idx = alunosExistentes.findIndex(a => a.codigoMatricula === novoAluno.codigoMatricula || (a.numeroBI && a.numeroBI !== '000000000LA000' && a.numeroBI === novoAluno.numeroBI));
          if (idx >= 0) {
            alunosExistentes[idx] = { ...alunosExistentes[idx], ...novoAluno, id: alunosExistentes[idx].id };
          } else {
            alunosExistentes.push(novoAluno);
          }
          totalAlunos++;
        }
        dbService.salvarAlunos(alunosExistentes);
      }

      // 5. Processar Disciplinas
      const folhaDisciplinas = sheets.find(s => s.selecionado && s.tipoDetectado === 'Disciplinas');
      if (folhaDisciplinas) {
        const ws = workbookRaw.Sheets[folhaDisciplinas.sheetName];
        const dataDisc = XLSX.utils.sheet_to_json<any>(ws);
        const discExistentes = dbService.getDisciplinas();

        for (const row of dataDisc) {
          const nomeDisc = (row.Nome || row.nome || '').toString().trim();
          if (!nomeDisc) continue;

          const classesStr = (row.Classes || row.classes || '').toString();
          const classesArray = classesStr ? classesStr.split(/[,;]/).map((c: string) => normalizarClasse(c.trim())).filter(Boolean) : [];
          const ciclo = (row.Ciclo || row.ciclo || 'Geral').toString();

          const novaDisc: Disciplina = {
            id: `disc-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            nome: nomeDisc,
            sigla: (row.Sigla || row.sigla || nomeDisc.substring(0, 3).toUpperCase()).toString(),
            codigo: (row.Codigo || row.codigo || `${nomeDisc.substring(0, 3).toUpperCase()}-MED`).toString(),
            cargaHorariaSemanal: Number(row.CargaHoraria || row.cargaHoraria || 4),
            componente: (row.Componente || row.componente || 'Geral') as any,
            nivelEnsino: (row.NivelEnsino || row.nivelEnsino || 'ICiclo') as any,
            classe: classesArray[0] || undefined,
            classes: classesArray.length > 0 ? classesArray : undefined,
            ciclo
          };

          const idx = discExistentes.findIndex(d => d.nome.toLowerCase() === nomeDisc.toLowerCase());
          if (idx >= 0) {
            discExistentes[idx] = { ...discExistentes[idx], ...novaDisc, id: discExistentes[idx].id };
          } else {
            discExistentes.push(novaDisc);
          }
          totalDisciplinas++;
        }
        dbService.salvarDisciplinas(discExistentes);
      }

      // Registrar auditoria
      dbService.registarLog(
        'Importação Excel Homologada',
        `Diretor importou e homologou dados do Ano Letivo ${anoLetivoAlvo}: ${totalAlunos} estudantes, ${totalTurmas} turmas e ${totalDisciplinas} disciplinas integradas.`
      );

      setLoading(false);
      onImportacaoConcluida(
        `Importação concluída e reconhecida pelo sistema! Ano Letivo ${anoLetivoAlvo} atualizado: ${totalAlunos} alunos, ${totalTurmas} turmas e ${totalDisciplinas} disciplinas processadas com sucesso.`
      );
      onClose();
    } catch (err: any) {
      console.error('Falha na homologação:', err);
      setFeedback({ tipo: 'erro', texto: `Erro ao integrar dados: ${err.message || 'Erro inesperado'}` });
      setLoading(false);
    }
  };

  const folhaAtiva = sheets[selectedSheetIndex];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full border-2 border-blue-600 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* CABEÇALHO */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
              <FileSpreadsheet className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">Importação & Homologação Escolar via Excel</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-blue-950">
                  Direção & Administração
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Adicione dados escolares e de um ano letivo a partir de um ficheiro com um ou vários livros com pré-visualização e validação de tipos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO MODAL COM SCROLL */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ÁREA DE UPLOAD E MODELO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-5 text-center bg-blue-50/50 transition-colors">
              <input
                type="file"
                id="excelFileInput"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="excelFileInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black text-blue-900 block">
                    {fileName ? `Ficheiro carregado: ${fileName}` : 'Clique para carregar livro Excel (.xlsx / .xls)'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Suporte a múltiplos livros/folhas: Ano Lectivo, Turmas, Alunos, Disciplinas
                  </span>
                </div>
              </label>
            </div>

            {/* BOTÃO PARA BAIXAR MODELO MED */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Modelo de Exemplo MED</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Descarregue o modelo com as 4 folhas oficiais prontas para preenchimento.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBaixarModeloExemplo}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Baixar Modelo Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* FEEDBACK MENSAGEM */}
          {feedback && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              feedback.tipo === 'sucesso' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
            }`}>
              {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{feedback.texto}</span>
            </div>
          )}

          {/* PARÂMETROS E ANO LETIVO HOMOLOGADO */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Parâmetros de Reconhecimento do Ano Letivo
                </h4>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                Sincronização Ativa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Rótulo do Ano Letivo</label>
                <input
                  type="text"
                  value={anoLetivoAlvo}
                  onChange={(e) => setAnoLetivoAlvo(e.target.value)}
                  placeholder="Ex: 2025/2026"
                  className="w-full p-2 border border-gray-300 rounded-xl font-black bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Início das Aulas</label>
                <input
                  type="date"
                  value={dataInicioAno}
                  onChange={(e) => setDataInicioAno(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-xl bg-white text-gray-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Término do Ano</label>
                <input
                  type="date"
                  value={dataFimAno}
                  onChange={(e) => setDataFimAno(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-xl bg-white text-gray-900 text-xs"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={definirComoAtivo}
                    onChange={(e) => setDefinirComoAtivo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-800">Definir como Ano Activo</span>
                </label>
              </div>
            </div>
          </div>

          {/* FOLHAS DETETADAS NO LIVRO EXCEL */}
          {sheets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Livros e Folhas Detectadas no Ficheiro ({sheets.length})</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Selecione as folhas que deseja validar e pré-visualizar antes da homologação
                  </p>
                </div>
              </div>

              {/* TABS DE FOLHAS */}
              <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                {sheets.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedSheetIndex === idx
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.selecionado}
                      onChange={() => handleToggleSheet(idx)}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                      title="Incluir esta folha na importação"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedSheetIndex(idx)}
                      className="cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>{s.sheetName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        selectedSheetIndex === idx ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.rowCount} linhas
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {/* PRÉ-VISUALIZAÇÃO DA FOLHA ATIVA E VALIDAÇÃO DE TIPOS */}
              {folhaAtiva && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-black text-gray-900">
                        Pré-visualização dos Dados: <span className="text-blue-700 font-mono font-bold">{folhaAtiva.sheetName}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Tipo: {folhaAtiva.tipoDetectado}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Mostrando primeiras 15 linhas de {folhaAtiva.rowCount} registos
                    </span>
                  </div>

                  {/* TABELA DE PRÉ-VISUALIZAÇÃO */}
                  <div className="overflow-x-auto max-h-60 border border-gray-200 rounded-xl">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="p-2 w-8 text-center bg-slate-100">#</th>
                          {folhaAtiva.columns.map((col, cIdx) => (
                            <th key={cIdx} className="p-2 whitespace-nowrap bg-slate-100">
                              <div className="flex flex-col">
                                <span>{col}</span>
                                <span className="text-[9px] font-normal text-slate-500 lowercase">
                                  {col.toLowerCase().includes('data') ? '(data)' : col.toLowerCase().includes('bi') ? '(texto/bi)' : col.toLowerCase().includes('numero') || col.toLowerCase().includes('capacidade') ? '(número)' : '(texto)'}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {folhaAtiva.sampleRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-blue-50/50">
                            <td className="p-2 text-center text-gray-400 font-mono font-bold">{rIdx + 1}</td>
                            {folhaAtiva.columns.map((col, cIdx) => (
                              <td key={cIdx} className="p-2 whitespace-nowrap text-gray-700 font-medium">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHECKBOXES DE CONFIRMAÇÃO EXIGIDA PELO DIRETOR */}
          <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Validação e Reconhecimento Oficial no Sistema SGE-NG</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmouTiposDados}
                  onChange={(e) => setConfirmouTiposDados(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-amber-400 mt-0.5 cursor-pointer"
                />
                <span className="text-gray-800 font-medium">
                  <strong>Confirmo a pré-visualização e os tipos de dados:</strong> Verifiquei as colunas, nomes, números de BI, turmas, classes e disciplinas conforme as normas do Ministério da Educação.
                </span>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmouAnoLetivo}
                  onChange={(e) => setConfirmouAnoLetivo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-amber-400 mt-0.5 cursor-pointer"
                />
                <span className="text-gray-800 font-medium">
                  <strong>Homologação do Ano Letivo ({anoLetivoAlvo}):</strong> Confirmo que os dados a importar serão vinculados e reconhecidos com integridade no ano letivo estipulado.
                </span>
              </label>
            </div>
          </div>

        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Registo auditado e assinado digitalmente na trilha de segurança do SGE.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={loading || !workbookRaw || !confirmouTiposDados}
              onClick={handleConfirmarImportacao}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md transition-all ${
                loading || !workbookRaw || !confirmouTiposDados
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-lg'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>Confirmar e Homologar no Sistema</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
