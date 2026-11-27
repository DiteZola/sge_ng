import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Database,
  Calendar,
  Layers,
  ShieldCheck,
  Download,
  X,
  Building2
} from 'lucide-react';
import { Aluno, Turma, Disciplina, Escola, AnoLectivoConfig, Funcionario, NotaTrimestralConsolidada } from '../types';
import { dbService } from '../services/storage';
import { firebaseSyncEngine } from '../services/firebaseSyncEngine';
import { normalizarClasse } from '../services/academicHierarchyService';
import {
  TipoFolhaExcelImport,
  extrairLinhasComCabecalhoAutomatico,
  classificarFolhaExcel,
  obterCampoFlexivel,
  obterCampoBrutoFlexivel,
  converterValorDataExcel,
  converterNumeroNotaExcel,
  normalizarClasseImportacao,
  inferirNivelEnsinoPorClasse,
  normalizarTurnoImportacao,
  normalizarGeneroImportacao,
  normalizarAnoLectivoImportacao,
  normalizarRoleImportacao,
  normalizarTextoComparacao,
  ALIASES_ALUNO,
  ALIASES_FUNCIONARIO,
  ALIASES_NOTA
} from '../utils/flexibleExcelImport';

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
  sampleRows: Record<string, any>[];
  allRows: Record<string, any>[];
  headerRowIndex: number;
  tipoDetectado: TipoFolhaExcelImport;
  escolaDetectada?: string;
  anoDetectado?: string;
  turmaDetectada?: string;
  classeDetectada?: string;
  selecionado: boolean;
}

const TIPOS_FOLHA_OPCOES: { value: TipoFolhaExcelImport; label: string }[] = [
  { value: 'Alunos', label: 'Alunos / Matrículas' },
  { value: 'Turmas', label: 'Turmas' },
  { value: 'Disciplinas', label: 'Disciplinas' },
  { value: 'Funcionarios', label: 'Funcionários / RH' },
  { value: 'Notas', label: 'Notas / Pautas' },
  { value: 'AnoLectivo', label: 'Ano Lectivo' },
  { value: 'Desconhecido', label: 'Ignorar Folha' }
];

export const ExcelSchoolDataImportModal: React.FC<ExcelSchoolDataImportModalProps> = ({
  isOpen,
  onClose,
  escola,
  onImportacaoConcluida
}) => {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<SheetPreviewData[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  // Configurações flexíveis do Ano Letivo e origem
  const [anoLetivoAlvo, setAnoLetivoAlvo] = useState(escola.anoLectivoActivo || '');
  const [escolaOrigemDetectada, setEscolaOrigemDetectada] = useState('');
  const [definirComoAtivo, setDefinirComoAtivo] = useState(false);
  const [respeitarVagasTurma, setRespeitarVagasTurma] = useState(true);
  const [dataInicioAno, setDataInicioAno] = useState('2025-09-01');
  const [dataFimAno, setDataFimAno] = useState('2026-07-31');

  const [confirmouTiposDados, setConfirmouTiposDados] = useState(false);
  const [confirmouAnoLetivo, setConfirmouAnoLetivo] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setLoading(true);
    setFileName(uploadedFile.name);
    setFeedback(null);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      let escolaEncontrada = '';
      let anoEncontradoGlobal = '';

      const parsedSheets: SheetPreviewData[] = wb.SheetNames.map(sheetName => {
        const ws = wb.Sheets[sheetName];
        const parsed = extrairLinhasComCabecalhoAutomatico(XLSX, ws);
        const tipoDetectado = classificarFolhaExcel(sheetName, parsed.headers);

        if (!escolaEncontrada && parsed.metadados.escolaDetectada) {
          escolaEncontrada = parsed.metadados.escolaDetectada;
        }
        if (!anoEncontradoGlobal && parsed.metadados.anoLectivoDetectado) {
          anoEncontradoGlobal = parsed.metadados.anoLectivoDetectado;
        }

        return {
          sheetName,
          rowCount: parsed.rows.length,
          columns: parsed.headers,
          sampleRows: parsed.rows.slice(0, 15),
          allRows: parsed.rows,
          headerRowIndex: parsed.headerRowIndex,
          tipoDetectado,
          escolaDetectada: parsed.metadados.escolaDetectada,
          anoDetectado: parsed.metadados.anoLectivoDetectado,
          turmaDetectada: parsed.metadados.turmaDetectada,
          classeDetectada: parsed.metadados.classeDetectada,
          selecionado: tipoDetectado !== 'Desconhecido' && parsed.rows.length > 0
        };
      });

      setSheets(parsedSheets);
      setSelectedSheetIndex(0);
      setEscolaOrigemDetectada(escolaEncontrada);

      const folhaAno = parsedSheets.find(s => s.tipoDetectado === 'AnoLectivo');
      if (folhaAno && folhaAno.allRows.length > 0) {
        const primeiro = folhaAno.allRows[0];
        const rot = obterCampoFlexivel(primeiro, ['Rotulo', 'AnoLectivo', 'Ano Lectivo', 'Ano Letivo', 'Ano']);
        if (rot) anoEncontradoGlobal = normalizarAnoLectivoImportacao(rot, anoEncontradoGlobal);
      }

      if (anoEncontradoGlobal) {
        setAnoLetivoAlvo(anoEncontradoGlobal);
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setFeedback({ tipo: 'erro', texto: `Erro ao ler ficheiro Excel: ${err.message || 'Formato não reconhecido'}` });
      setLoading(false);
    }
  };

  const handleToggleSheet = (index: number) => {
    setSheets(prev => prev.map((s, idx) => (idx === index ? { ...s, selecionado: !s.selecionado } : s)));
  };

  const handleAlterarTipoSheet = (index: number, novoTipo: TipoFolhaExcelImport) => {
    setSheets(prev =>
      prev.map((s, idx) =>
        idx === index ? { ...s, tipoDetectado: novoTipo, selecionado: novoTipo !== 'Desconhecido' } : s
      )
    );
  };

  const handleBaixarModeloExemplo = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          Rotulo: escola.anoLectivoActivo || '2025/2026',
          DataInicio: '2025-09-01',
          DataFim: '2026-07-31',
          Estado: 'Aberto',
          Descricao: 'Ano Lectivo Oficial MED Angola'
        }
      ]),
      'Ano_Lectivo'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Nome: '7ª A', Classe: '7ª', NivelEnsino: 'ICiclo', Turno: 'Manhã', Sala: 'Sala 01', Capacidade: 45, AnoLectivo: escola.anoLectivoActivo || '2025/2026', Curso: 'Geral' },
        { Nome: '10ª CFB-1', Classe: '10ª', NivelEnsino: 'IICiclo', Turno: 'Tarde', Sala: 'Sala 04', Capacidade: 40, AnoLectivo: escola.anoLectivoActivo || '2025/2026', Curso: 'Ciências Físicas e Biológicas (PUNIV)' }
      ]),
      'Turmas'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          NumeroOrdem: 1,
          CodigoMatricula: 'MED-2025-001',
          NomeCompleto: 'António Domingos Manuel',
          Genero: 'M',
          DataNascimento: '2010-04-12',
          BI: '005432198LA045',
          Telefone: '923456789',
          Encarregado: 'Manuel Domingos',
          TelefoneEncarregado: '912345678',
          Classe: '7ª',
          TurmaNome: '7ª A',
          Estado: 'Ativo'
        }
      ]),
      'Alunos'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Nome: 'Língua Portuguesa', Sigla: 'LP', Codigo: 'LP-MED', CargaHoraria: 5, Componente: 'Geral', Classes: '7ª, 8ª, 9ª' },
        { Nome: 'Matemática', Sigla: 'MAT', Codigo: 'MAT-MED', CargaHoraria: 5, Componente: 'Geral', Classes: '7ª, 8ª, 9ª' }
      ]),
      'Disciplinas'
    );
    XLSX.writeFile(wb, 'Modelo_Oficial_Importacao_Escolar_MED_Angola.xlsx');
  };

  const handleConfirmarImportacao = () => {
    if (sheets.length === 0) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, carregue primeiro um ficheiro Excel válido.' });
      return;
    }
    if (!confirmouTiposDados) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, confirme a validação dos tipos de dados antes de prosseguir.' });
      return;
    }

    setLoading(true);

    try {
      const escolaId = escola.id;
      const anoAlvoNorm = normalizarAnoLectivoImportacao(anoLetivoAlvo, escola.anoLectivoActivo);
      let totalAlunos = 0;
      let totalTurmas = 0;
      let totalDisciplinas = 0;
      let totalFuncionarios = 0;
      let totalNotas = 0;
      let totalDuplicadosIgnorados = 0;
      let totalIgnoradosSemVaga = 0;

      // 1. Ano Lectivo
      const folhaAno = sheets.find(s => s.selecionado && s.tipoDetectado === 'AnoLectivo');
      let anoCadastrado = false;
      if (folhaAno && folhaAno.allRows.length > 0) {
        const item = folhaAno.allRows[0];
        const rotulo = normalizarAnoLectivoImportacao(
          obterCampoFlexivel(item, ['Rotulo', 'AnoLectivo', 'Ano Lectivo', 'Ano Letivo', 'Ano']),
          anoAlvoNorm
        );
        const dtIni = converterValorDataExcel(obterCampoBrutoFlexivel(item, ['DataInicio', 'Data Início', 'Inicio'])) || dataInicioAno;
        const dtFim = converterValorDataExcel(obterCampoBrutoFlexivel(item, ['DataFim', 'Data Fim', 'Fim'])) || dataFimAno;
        if (rotulo) {
          const novaConfigAno: AnoLectivoConfig = {
            id: `ano-${escolaId}-${rotulo.replace(/\//g, '-')}`,
            escolaId,
            rotulo,
            dataInicio: dtIni,
            dataFim: dtFim,
            estado: 'Aberto',
            trimestres: [
              { trimestre: '1º Trimestre', nome: 'Iº Trimestre', dataInicio: dtIni, dataFim: '2025-12-15', estado: 'Aberto' },
              { trimestre: '2º Trimestre', nome: 'IIº Trimestre', dataInicio: '2026-01-05', dataFim: '2026-04-10', estado: 'Aberto' },
              { trimestre: '3º Trimestre', nome: 'IIIº Trimestre', dataInicio: '2026-04-20', dataFim: dtFim, estado: 'Aberto' }
            ],
            criadoEm: new Date().toISOString(),
            descricao: `Importado via Excel${escolaOrigemDetectada ? ` (Origem: ${escolaOrigemDetectada})` : ''}`
          };
          dbService.salvarAnoLectivoConfig(novaConfigAno);
          anoCadastrado = true;
        }
      }

      if (!anoCadastrado && anoAlvoNorm) {
        const anosExistentes = dbService.getAnosLectivos(escolaId);
        if (!anosExistentes.includes(anoAlvoNorm)) {
          const novaConfigAno: AnoLectivoConfig = {
            id: `ano-${escolaId}-${anoAlvoNorm.replace(/\//g, '-')}`,
            escolaId,
            rotulo: anoAlvoNorm,
            dataInicio: dataInicioAno,
            dataFim: dataFimAno,
            estado: 'Aberto',
            trimestres: [
              { trimestre: '1º Trimestre', nome: 'Iº Trimestre', dataInicio: dataInicioAno, dataFim: '2025-12-15', estado: 'Aberto' },
              { trimestre: '2º Trimestre', nome: 'IIº Trimestre', dataInicio: '2026-01-05', dataFim: '2026-04-10', estado: 'Aberto' },
              { trimestre: '3º Trimestre', nome: 'IIIº Trimestre', dataInicio: '2026-04-20', dataFim: dataFimAno, estado: 'Aberto' }
            ],
            criadoEm: new Date().toISOString(),
            descricao: 'Criado via Importador Flexível Excel'
          };
          dbService.salvarAnoLectivoConfig(novaConfigAno);
        }
      }

      if (definirComoAtivo && anoAlvoNorm) {
        dbService.salvarEscola({ ...escola, anoLectivoActivo: anoAlvoNorm });
      }

      // 2. Preparar coleções base
      const turmasExistentes = [...dbService.getTurmas()];
      const alunosExistentes = [...dbService.getAlunos()];
      const discExistentes = [...dbService.getDisciplinas()];
      const funcsExistentes = [...dbService.getFuncionariosBruto()];
      const notasExistentes = [...dbService.getNotasConsolidadas()];

      const ensureTurma = (
        nomeTurmaRaw: string,
        classeRaw: string,
        turnoRaw: string,
        cursoRaw: string,
        salaRaw: string,
        anoRow: string,
        capacidadeRaw?: number
      ): Turma | null => {
        const classeNorm = normalizarClasse(normalizarClasseImportacao(classeRaw || '1ª'));
        const anoT = normalizarAnoLectivoImportacao(anoRow, anoAlvoNorm);
        const nomeFinal = (nomeTurmaRaw || '').trim() || `${classeNorm} A`;

        const found = turmasExistentes.find(
          t =>
            t.escolaId === escolaId &&
            normalizarTextoComparacao(t.nome) === normalizarTextoComparacao(nomeFinal) &&
            (!anoT || !t.anoLectivo || t.anoLectivo === anoT)
        );
        if (found) return found;

        const novaT: Turma = {
          id: `turma-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          escolaId,
          nome: nomeFinal,
          classe: classeNorm,
          nivelEnsino: inferirNivelEnsinoPorClasse(classeNorm),
          turno: normalizarTurnoImportacao(turnoRaw),
          sala: salaRaw || 'Sala 01',
          capacidade: capacidadeRaw || 45,
          capacidadeMaxima: capacidadeRaw || 45,
          anoLectivo: anoT,
          curso: cursoRaw || (['10ª', '11ª', '12ª', '13ª'].includes(classeNorm) ? 'Ciências Físicas e Biológicas (PUNIV)' : 'Ensino Geral')
        };
        turmasExistentes.push(novaT);
        firebaseSyncEngine.salvarTurma(novaT);
        totalTurmas++;
        return novaT;
      };

      const ensureDisciplina = (nomeDiscRaw: string, classeNorm?: string): Disciplina | null => {
        const nomeD = (nomeDiscRaw || '').trim();
        if (!nomeD || nomeD === '—') return null;
        const found = discExistentes.find(
          d => (!d.escolaId || d.escolaId === escolaId) && normalizarTextoComparacao(d.nome) === normalizarTextoComparacao(nomeD)
        );
        if (found) return found;
        const novaD: Disciplina = {
          id: `disc-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          escolaId,
          nome: nomeD,
          sigla: nomeD.substring(0, 3).toUpperCase(),
          codigo: `${nomeD.substring(0, 3).toUpperCase()}-MED`,
          cargaHorariaSemanal: 4,
          componente: 'Geral' as any,
          nivelEnsino: inferirNivelEnsinoPorClasse(classeNorm || '10ª'),
          classe: classeNorm || undefined,
          classes: classeNorm ? [classeNorm] : undefined,
          anoLectivo: anoAlvoNorm
        };
        discExistentes.push(novaD);
        firebaseSyncEngine.salvarDisciplina(novaD);
        totalDisciplinas++;
        return novaD;
      };

      // 3. Turmas
      for (const sheet of sheets.filter(s => s.selecionado && s.tipoDetectado === 'Turmas')) {
        for (const row of sheet.allRows) {
          const nomeT = obterCampoFlexivel(row, ['Nome da Turma', 'Nome', 'Turma', 'Designação', 'turmaNome']);
          const classeT = obterCampoFlexivel(row, ['Classe', 'classe', 'ClasseID', 'Ano Escolar']) || sheet.classeDetectada || '1ª';
          if (!nomeT && !classeT) continue;
          const turnoT = obterCampoFlexivel(row, ['Turno', 'Período', 'turno', 'periodo']);
          const salaT = obterCampoFlexivel(row, ['Sala', 'Sala de Aula', 'sala']);
          const capT = Number(obterCampoFlexivel(row, ['Capacidade', 'Capacidade Máxima', 'Vagas', 'capacidade'])) || 45;
          const cursoT = obterCampoFlexivel(row, ['Curso', 'Curso / Área', 'Especialidade', 'curso']);
          const anoT = obterCampoFlexivel(row, ['Ano Lectivo', 'Ano Letivo', 'AnoLectivo']) || sheet.anoDetectado || anoAlvoNorm;
          ensureTurma(nomeT, classeT, turnoT, cursoT, salaT, anoT, capT);
        }
      }

      // 4. Disciplinas
      for (const sheet of sheets.filter(s => s.selecionado && s.tipoDetectado === 'Disciplinas')) {
        for (const row of sheet.allRows) {
          const nomeDisc = obterCampoFlexivel(row, ['Disciplina', 'Nome', 'Nome da Disciplina', 'Cadeira']);
          if (!nomeDisc) continue;
          const classesStr = obterCampoFlexivel(row, ['Classes', 'Classe', 'classes', 'classe']);
          const classesArray = classesStr
            ? classesStr.split(/[,;]/).map(c => normalizarClasse(normalizarClasseImportacao(c.trim()))).filter(Boolean)
            : [];
          const existing = discExistentes.find(
            d => (!d.escolaId || d.escolaId === escolaId) && normalizarTextoComparacao(d.nome) === normalizarTextoComparacao(nomeDisc)
          );
          if (!existing) {
            const novaDisc: Disciplina = {
              id: `disc-imp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              escolaId,
              nome: nomeDisc,
              sigla: obterCampoFlexivel(row, ['Sigla', 'sigla']) || nomeDisc.substring(0, 3).toUpperCase(),
              codigo: obterCampoFlexivel(row, ['Codigo', 'Código', 'codigo']) || `${nomeDisc.substring(0, 3).toUpperCase()}-MED`,
              cargaHorariaSemanal: Number(obterCampoFlexivel(row, ['CargaHoraria', 'Carga Horária', 'cargaHoraria'])) || 4,
              componente: (obterCampoFlexivel(row, ['Componente', 'componente']) || 'Geral') as any,
              nivelEnsino: inferirNivelEnsinoPorClasse(classesArray[0] || '7ª'),
              classe: classesArray[0] || undefined,
              classes: classesArray.length > 0 ? classesArray : undefined,
              ciclo: obterCampoFlexivel(row, ['Ciclo', 'ciclo']) || 'Geral',
              anoLectivo: anoAlvoNorm
            };
            discExistentes.push(novaDisc);
            firebaseSyncEngine.salvarDisciplina(novaDisc);
            totalDisciplinas++;
          }
        }
      }

      // 5. Funcionários
      for (const sheet of sheets.filter(s => s.selecionado && s.tipoDetectado === 'Funcionarios')) {
        for (const row of sheet.allRows) {
          const nomeF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.nomeCompleto);
          if (!nomeF) continue;
          const biF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.numeroBI).replace(/\*\*\*.*?\*\*\*/g, '').trim();
          const agenteF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.numeroAgente);
          const emailF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.email).replace(/\*\*\*.*?\*\*\*/g, '').trim();
          const telF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.telefone).replace(/\*\*\*.*?\*\*\*/g, '').trim();
          const cargoF = obterCampoFlexivel(row, ALIASES_FUNCIONARIO.cargo) || 'Professor';
          const roleF = normalizarRoleImportacao(obterCampoFlexivel(row, ALIASES_FUNCIONARIO.role), cargoF);
          if (roleF === 'AdminGeral') continue;
          const dnF = converterValorDataExcel(obterCampoBrutoFlexivel(row, ALIASES_FUNCIONARIO.dataNascimento)) || '1990-01-01';
          const admF = converterValorDataExcel(obterCampoBrutoFlexivel(row, ALIASES_FUNCIONARIO.dataAdmissao)) || new Date().toISOString().split('T')[0];

          const existente = funcsExistentes.find(
            f =>
              f.escolaId === escolaId &&
              ((biF && f.numeroBI && normalizarTextoComparacao(f.numeroBI) === normalizarTextoComparacao(biF)) ||
                (agenteF && f.numeroAgente && normalizarTextoComparacao(f.numeroAgente) === normalizarTextoComparacao(agenteF)) ||
                normalizarTextoComparacao(f.nomeCompleto) === normalizarTextoComparacao(nomeF))
          );
          if (existente) {
            totalDuplicadosIgnorados++;
            continue;
          }

          const novoFunc: Funcionario = {
            id: `func-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            escolaId,
            nomeCompleto: nomeF,
            numeroBI: biF || `BI-${Date.now().toString().slice(-6)}`,
            numeroAgente: agenteF || undefined,
            genero: normalizarGeneroImportacao(obterCampoFlexivel(row, ALIASES_FUNCIONARIO.genero)),
            dataNascimento: dnF,
            telefone: telF,
            email: emailF || `${normalizarTextoComparacao(nomeF).replace(/\s+/g, '.')}@escola.gov.ao`,
            cargo: cargoF,
            role: roleF,
            ehProfessor: roleF === 'Professor' || ['sim', 'true', '1'].includes(normalizarTextoComparacao(obterCampoFlexivel(row, ALIASES_FUNCIONARIO.ehProfessor))),
            ehAdministrativoQueLeciona: false,
            fotoUrl: '',
            habilitacoes: obterCampoFlexivel(row, ALIASES_FUNCIONARIO.habilitacoes) || 'Licenciatura',
            especialidade: obterCampoFlexivel(row, ALIASES_FUNCIONARIO.especialidade) || undefined,
            dataAdmissao: admF,
            ativo: true,
            statusConta: 'Ativa',
            atualizadoEm: new Date().toISOString()
          };
          funcsExistentes.push(novoFunc);
          firebaseSyncEngine.salvarFuncionariosLote([novoFunc]);
          totalFuncionarios++;
        }
      }

      // 6. Alunos
      const ocupacaoPorTurma = new Map<string, number>();
      alunosExistentes
        .filter(a => a.escolaId === escolaId && a.estado !== 'Desistente' && a.estado !== 'Transferido')
        .forEach(a => {
          if (a.turmaId) ocupacaoPorTurma.set(a.turmaId, (ocupacaoPorTurma.get(a.turmaId) || 0) + 1);
        });

      for (const sheet of sheets.filter(s => s.selecionado && s.tipoDetectado === 'Alunos')) {
        for (let rIdx = 0; rIdx < sheet.allRows.length; rIdx++) {
          const row = sheet.allRows[rIdx];
          const nomeAluno = obterCampoFlexivel(row, ALIASES_ALUNO.nomeCompleto);
          if (!nomeAluno) continue;

          const anoAluno = normalizarAnoLectivoImportacao(
            obterCampoFlexivel(row, ALIASES_ALUNO.anoLectivo) || sheet.anoDetectado,
            anoAlvoNorm
          );
          const classe = normalizarClasse(
            normalizarClasseImportacao(obterCampoFlexivel(row, ALIASES_ALUNO.classe) || sheet.classeDetectada || '1ª')
          );
          const turmaNome = obterCampoFlexivel(row, ALIASES_ALUNO.turmaNome) || sheet.turmaDetectada || '';
          const curso = obterCampoFlexivel(row, ALIASES_ALUNO.curso);
          const turno = obterCampoFlexivel(row, ALIASES_ALUNO.turno);
          const sala = obterCampoFlexivel(row, ALIASES_ALUNO.sala);
          const turmaObj = ensureTurma(turmaNome, classe, turno, curso, sala, anoAluno);
          const turmaId = turmaObj?.id || '';

          const codMatRaw = obterCampoFlexivel(row, ALIASES_ALUNO.codigoMatricula);
          const biRaw = obterCampoFlexivel(row, ALIASES_ALUNO.numeroBI);
          const dataNascRaw = converterValorDataExcel(obterCampoBrutoFlexivel(row, ALIASES_ALUNO.dataNascimento));
          const estadoRaw = (obterCampoFlexivel(row, ALIASES_ALUNO.estado) || 'Ativo') as Aluno['estado'];

          const duplicadoExistente = alunosExistentes.find(a => {
            if (a.escolaId !== escolaId) return false;
            if (codMatRaw && a.codigoMatricula && normalizarTextoComparacao(a.codigoMatricula) === normalizarTextoComparacao(codMatRaw)) return true;
            if (biRaw && biRaw !== 'S/Doc' && a.numeroBI && normalizarTextoComparacao(a.numeroBI) === normalizarTextoComparacao(biRaw)) return true;
            if (
              normalizarTextoComparacao(a.nomeCompleto) === normalizarTextoComparacao(nomeAluno) &&
              (!anoAluno || !a.anoLectivo || a.anoLectivo === anoAluno) &&
              (!dataNascRaw || !a.dataNascimento || a.dataNascimento === dataNascRaw)
            ) {
              return true;
            }
            return false;
          });

          if (duplicadoExistente) {
            totalDuplicadosIgnorados++;
            continue;
          }

          if (respeitarVagasTurma && turmaObj && estadoRaw !== 'Desistente' && estadoRaw !== 'Transferido') {
            const cap = Math.max(1, Number(turmaObj.capacidade || turmaObj.capacidadeMaxima || 45));
            const ocup = ocupacaoPorTurma.get(turmaObj.id) || 0;
            if (ocup >= cap) {
              totalIgnoradosSemVaga++;
              continue;
            }
            ocupacaoPorTurma.set(turmaObj.id, ocup + 1);
          }

          const novoAluno: Aluno = {
            id: `aluno-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            escolaId,
            codigoMatricula: codMatRaw || `MED-${Date.now().toString().slice(-6)}-${totalAlunos + 1}`,
            numeroProcesso: codMatRaw || `PROC-${Date.now().toString().slice(-6)}-${totalAlunos + 1}`,
            numeroOrdem: Number(obterCampoFlexivel(row, ALIASES_ALUNO.numeroOrdem)) || totalAlunos + 1,
            nomeCompleto: nomeAluno,
            genero: normalizarGeneroImportacao(obterCampoFlexivel(row, ALIASES_ALUNO.genero)),
            dataNascimento: dataNascRaw || '2014-01-01',
            naturalidade: obterCampoFlexivel(row, ALIASES_ALUNO.naturalidade) || 'Luanda',
            provinciaOrigem: obterCampoFlexivel(row, ALIASES_ALUNO.provinciaOrigem) || escola.provincia || 'Luanda',
            numeroBI: biRaw || 'S/Doc',
            numeroDocumento: biRaw || undefined,
            telefone: obterCampoFlexivel(row, ALIASES_ALUNO.telefone),
            fotoUrl: '',
            nomePai: obterCampoFlexivel(row, ALIASES_ALUNO.nomePai) || undefined,
            nomeMae: obterCampoFlexivel(row, ALIASES_ALUNO.nomeMae) || undefined,
            encarregadoNome: obterCampoFlexivel(row, ALIASES_ALUNO.encarregadoNome) || 'Encarregado de Educação',
            encarregadoParentesco: 'Encarregado',
            encarregadoTelefone: obterCampoFlexivel(row, ALIASES_ALUNO.encarregadoTelefone),
            estado: estadoRaw,
            turmaId,
            classeId: classe,
            curso: curso || turmaObj?.curso,
            turno: normalizarTurnoImportacao(turno),
            anoLectivo: anoAluno,
            anoMatricula: anoAluno,
            propinaStatus: 'Regularizada',
            historicoAnterior: [],
            cadastradoEm: new Date().toISOString().split('T')[0],
            atualizadoEm: new Date().toISOString()
          };

          alunosExistentes.push(novoAluno);
          firebaseSyncEngine.salvarAluno(novoAluno);
          totalAlunos++;
        }
      }

      // 7. Notas
      for (const sheet of sheets.filter(s => s.selecionado && s.tipoDetectado === 'Notas')) {
        for (const row of sheet.allRows) {
          const alunoNome = obterCampoFlexivel(row, ALIASES_NOTA.alunoNome);
          const matAluno = obterCampoFlexivel(row, ALIASES_NOTA.codigoMatricula);
          const biAluno = obterCampoFlexivel(row, ALIASES_NOTA.numeroBI);
          const discNome = obterCampoFlexivel(row, ALIASES_NOTA.disciplinaNome);
          if ((!alunoNome && !matAluno) || !discNome) continue;

          const anoNota = normalizarAnoLectivoImportacao(
            obterCampoFlexivel(row, ALIASES_NOTA.anoLectivo) || sheet.anoDetectado,
            anoAlvoNorm
          );
          const classeNota = normalizarClasse(
            normalizarClasseImportacao(obterCampoFlexivel(row, ALIASES_NOTA.classe) || sheet.classeDetectada || '1ª')
          );
          const turmaNomeNota = obterCampoFlexivel(row, ALIASES_NOTA.turmaNome) || sheet.turmaDetectada || '';

          let alunoTarget = alunosExistentes.find(
            a =>
              a.escolaId === escolaId &&
              ((matAluno && a.codigoMatricula && normalizarTextoComparacao(a.codigoMatricula) === normalizarTextoComparacao(matAluno)) ||
                (biAluno && a.numeroBI && normalizarTextoComparacao(a.numeroBI) === normalizarTextoComparacao(biAluno)) ||
                (alunoNome && normalizarTextoComparacao(a.nomeCompleto) === normalizarTextoComparacao(alunoNome)))
          );

          if (!alunoTarget && alunoNome) {
            const turmaResolvida = ensureTurma(turmaNomeNota, classeNota, 'Manhã', '', 'Sala 01', anoNota);
            alunoTarget = {
              id: `aluno-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              escolaId,
              codigoMatricula: matAluno || `MED-${Date.now().toString().slice(-6)}`,
              numeroOrdem: alunosExistentes.length + 1,
              nomeCompleto: alunoNome,
              genero: 'M',
              dataNascimento: '2014-01-01',
              naturalidade: 'Luanda',
              provinciaOrigem: escola.provincia || 'Luanda',
              numeroBI: biAluno || 'S/Doc',
              telefone: '',
              fotoUrl: '',
              encarregadoNome: 'Encarregado de Educação',
              encarregadoParentesco: 'Encarregado',
              encarregadoTelefone: '',
              estado: 'Ativo',
              turmaId: turmaResolvida?.id || '',
              classeId: classeNota || turmaResolvida?.classe || '1ª',
              anoLectivo: anoNota,
              propinaStatus: 'Regularizada',
              historicoAnterior: [],
              cadastradoEm: new Date().toISOString().split('T')[0],
              atualizadoEm: new Date().toISOString()
            };
            alunosExistentes.push(alunoTarget);
            firebaseSyncEngine.salvarAluno(alunoTarget);
            totalAlunos++;
          }

          if (!alunoTarget) continue;
          const discTarget = ensureDisciplina(discNome, alunoTarget.classeId || classeNota);
          if (!discTarget) continue;

          const gravarNota = (trim: '1' | '2' | '3', mac?: number, npp?: number, npt?: number, mtRaw?: number, ne?: number, mf?: number) => {
            const vals = [mac, npp, npt].filter((v): v is number => v !== undefined);
            const mtCalc = mtRaw !== undefined ? mtRaw : vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : mf;
            if (mtCalc === undefined && mac === undefined && npp === undefined && npt === undefined && ne === undefined) return;
            const notaId = `${alunoTarget!.id}_${discTarget.id}_${trim}_${anoNota || 'padrao'}`;
            const idxN = notasExistentes.findIndex(
              n =>
                n.id === notaId ||
                (n.alunoId === alunoTarget!.id && n.disciplinaId === discTarget.id && String(n.trimestre).includes(trim) && (!anoNota || !n.anoLectivo || n.anoLectivo === anoNota))
            );
            const novaNota: NotaTrimestralConsolidada = {
              ...(idxN >= 0 ? notasExistentes[idxN] : {}),
              id: idxN >= 0 ? notasExistentes[idxN].id : notaId,
              escolaId,
              alunoId: alunoTarget!.id,
              turmaId: alunoTarget!.turmaId,
              disciplinaId: discTarget.id,
              disciplinaNome: discTarget.nome,
              trimestre: trim as any,
              anoLectivo: anoNota,
              mac: mac ?? 0,
              npp,
              npt: npt ?? 0,
              mediaTrimestral: mtCalc ?? 0,
              notaExame: trim === '3' ? ne : undefined,
              notaFinal: mf ?? mtCalc ?? 0,
              faltas: idxN >= 0 ? (notasExistentes[idxN].faltas ?? 0) : 0,
              validadaPelaDirecao: idxN >= 0 ? Boolean(notasExistentes[idxN].validadaPelaDirecao) : false,
              atualizadoEm: new Date().toISOString()
            };
            if (idxN >= 0) notasExistentes[idxN] = novaNota;
            else notasExistentes.push(novaNota);
            firebaseSyncEngine.salvarNotasConsolidadasLote([novaNota]);
            totalNotas++;
          };

          const trimSingle = obterCampoFlexivel(row, ALIASES_NOTA.trimestre);
          const mt1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt1));
          const mac1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac1));
          const npp1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp1));
          const npt1 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt1));
          const mt2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt2));
          const mac2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac2));
          const npp2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp2));
          const npt2 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt2));
          const mt3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt3));
          const mac3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac3));
          const npp3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp3));
          const npt3 = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt3));
          const neVal = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.ne));
          const mfVal = converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mf));

          const temMultiTrim = [mt1, mac1, npt1, mt2, mac2, npt2, mt3, mac3, npt3].some(v => v !== undefined);
          if (temMultiTrim) {
            gravarNota('1', mac1, npp1, npt1, mt1);
            gravarNota('2', mac2, npp2, npt2, mt2);
            gravarNota('3', mac3, npp3, npt3, mt3, neVal, mfVal);
          } else {
            const tDigit: '1' | '2' | '3' = trimSingle.includes('2') ? '2' : trimSingle.includes('3') ? '3' : '1';
            gravarNota(
              tDigit,
              converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mac)),
              converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npp)),
              converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.npt)),
              converterNumeroNotaExcel(obterCampoBrutoFlexivel(row, ALIASES_NOTA.mt)),
              neVal,
              mfVal
            );
          }
        }
      }

      dbService.salvarTurmas(turmasExistentes);
      dbService.salvarAlunos(alunosExistentes);
      dbService.salvarDisciplinas(discExistentes);
      if (totalFuncionarios > 0) dbService.salvarFuncionarios(funcsExistentes);
      if (totalNotas > 0) dbService.salvarNotasConsolidadas(notasExistentes);

      const extras = [
        totalDuplicadosIgnorados > 0 ? `${totalDuplicadosIgnorados} duplicado(s) ignorado(s)` : '',
        totalIgnoradosSemVaga > 0 ? `${totalIgnoradosSemVaga} sem vaga na turma` : ''
      ].filter(Boolean);
      const sufixo = extras.length > 0 ? ` (${extras.join('; ')})` : '';

      dbService.registarLog(
        'Importação Excel Flexível',
        `Ano ${anoAlvoNorm}: ${totalAlunos} alunos, ${totalTurmas} turmas, ${totalDisciplinas} disciplinas, ${totalFuncionarios} funcionários, ${totalNotas} notas${sufixo}.`
      );

      setLoading(false);
      onImportacaoConcluida(
        `Importação flexível concluída (${anoAlvoNorm})! ${totalAlunos} aluno(s), ${totalTurmas} turma(s), ${totalDisciplinas} disciplina(s), ${totalFuncionarios} funcionário(s) e ${totalNotas} nota(s)${sufixo}.`
      );
      onClose();
    } catch (err: any) {
      console.error('Falha na importação flexível:', err);
      setFeedback({ tipo: 'erro', texto: `Erro ao integrar dados: ${err.message || 'Erro inesperado'}` });
      setLoading(false);
    }
  };

  const folhaAtiva = sheets[selectedSheetIndex];

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full border-2 border-blue-600 dark:border-blue-500 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* CABEÇALHO */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shrink-0">
              <FileSpreadsheet className="w-7 h-7 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Importação Flexível de Dados Escolares via Excel
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-blue-950">
                  Outras Escolas & Anos
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Reconhecimento automático de cabeçalhos, colunas variantes, datas Excel, alunos, turmas, funcionários e notas de outros estabelecimentos ou anos lectivos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* UPLOAD E MODELO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 rounded-2xl p-5 text-center bg-blue-50/50 dark:bg-blue-950/30 transition-colors">
              <input
                type="file"
                id="excelFileInput"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black text-blue-900 dark:text-blue-200 block">
                    {fileName ? `Ficheiro carregado: ${fileName}` : 'Clique para carregar livro Excel (.xlsx / .xls)'}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Deteta automaticamente folhas de Alunos, Turmas, Disciplinas, Funcionários, Notas e Ano Lectivo
                  </span>
                </div>
              </label>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Modelo de Referência</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Descarregue um exemplo estruturado ou importe diretamente ficheiros de outras escolas.
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

          {escolaOrigemDetectada && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Escola de Origem Detetada no Ficheiro:</strong> {escolaOrigemDetectada} (será integrada em{' '}
                <strong>{escola.nomeOficial}</strong>)
              </span>
            </div>
          )}

          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-red-100 text-red-900 border border-red-300'
              }`}
            >
              {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{feedback.texto}</span>
            </div>
          )}

          {/* PARÂMETROS ANO LETIVO */}
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                  Ano Lectivo de Destino & Regras
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Ano Lectivo Alvo</label>
                <input
                  type="text"
                  value={anoLetivoAlvo}
                  onChange={e => setAnoLetivoAlvo(e.target.value)}
                  placeholder="Ex: 2024/2025"
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-xl font-black bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Início do Ano</label>
                <input
                  type="date"
                  value={dataInicioAno}
                  onChange={e => setDataInicioAno(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">Fim do Ano</label>
                <input
                  type="date"
                  value={dataFimAno}
                  onChange={e => setDataFimAno(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex flex-col justify-center gap-1.5 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={definirComoAtivo}
                    onChange={e => setDefinirComoAtivo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-[11px] font-bold">Definir como Ano Activo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={respeitarVagasTurma}
                    onChange={e => setRespeitarVagasTurma(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-[11px] font-bold">Validar Lotação de Turmas</span>
                </label>
              </div>
            </div>
          </div>

          {/* FOLHAS DETETADAS */}
          {sheets.length > 0 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Folhas Detectadas no Ficheiro ({sheets.length})</span>
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Pode ajustar manualmente o tipo de qualquer folha caso o ficheiro externo utilize nomes diferentes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
                {sheets.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedSheetIndex === idx
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.selecionado}
                      onChange={() => handleToggleSheet(idx)}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <button type="button" onClick={() => setSelectedSheetIndex(idx)} className="cursor-pointer flex items-center space-x-1.5">
                      <span>{s.sheetName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          selectedSheetIndex === idx ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                        }`}
                      >
                        {s.rowCount}
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {folhaAtiva && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-black">
                        Folha: <span className="text-blue-700 dark:text-blue-400 font-mono">{folhaAtiva.sheetName}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        (Cabeçalho na linha {folhaAtiva.headerRowIndex + 1})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Mapear como:</span>
                      <select
                        value={folhaAtiva.tipoDetectado}
                        onChange={e => handleAlterarTipoSheet(selectedSheetIndex, e.target.value as TipoFolhaExcelImport)}
                        className="px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-900 dark:text-indigo-200 text-xs"
                      >
                        {TIPOS_FOLHA_OPCOES.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-60 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-black uppercase text-[10px] border-b border-gray-200 dark:border-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2 w-8 text-center">#</th>
                          {folhaAtiva.columns.map((col, cIdx) => (
                            <th key={cIdx} className="p-2 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {folhaAtiva.sampleRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/70">
                            <td className="p-2 text-center text-gray-400 font-mono font-bold">{rIdx + 1}</td>
                            {folhaAtiva.columns.map((col, cIdx) => (
                              <td key={cIdx} className="p-2 whitespace-nowrap text-gray-700 dark:text-slate-200">
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

          {/* VALIDAÇÃO */}
          <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Confirmação de Importação Segura</span>
            </div>
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmouTiposDados}
                onChange={e => setConfirmouTiposDados(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
              />
              <span className="text-gray-800 dark:text-slate-200 font-medium">
                <strong>Confirmo a pré-visualização e mapeamento das folhas:</strong> duplicados existentes serão ignorados automaticamente e as datas/colunas reconhecidas serão integradas nesta escola.
              </span>
            </label>
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmouAnoLetivo}
                onChange={e => setConfirmouAnoLetivo(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
              />
              <span className="text-gray-800 dark:text-slate-200 font-medium">
                <strong>Associar registos ao Ano Lectivo {anoLetivoAlvo || escola.anoLectivoActivo}.</strong>
              </span>
            </label>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Compatível com livros exportados do SGE-NG ou de outras escolas/anos.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading || sheets.length === 0 || !confirmouTiposDados}
              onClick={handleConfirmarImportacao}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md transition-all ${
                loading || sheets.length === 0 || !confirmouTiposDados
                  ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Database className="w-4 h-4" />}
              <span>Importar para {escola.sigla || escola.nomeOficial}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
