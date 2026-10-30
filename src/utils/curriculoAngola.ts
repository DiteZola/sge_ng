import * as XLSX from 'xlsx';
import { Disciplina } from '../types';

/**
 * Mapeamento curricular rigoroso do Ministério da Educação de Angola (MED)
 * Permite filtrar disciplinas para que ao selecionar uma classe e/ou curso,
 * apenas as disciplinas válidas para aquela matriz apareçam.
 */
export function normalizarNomeClasse(classe: string): string {
  if (!classe) return '';
  return classe.trim().replace(/ª$/, '').replace(/ classe$/i, '').trim();
}

function obterDisciplinasBase(
  todasDisciplinas: Disciplina[],
  classe: string,
  curso?: string
): Disciplina[] {
  if (!classe) return todasDisciplinas;
  const classeNorm = normalizarNomeClasse(classe);
  const cursoNorm = (curso || '').toLowerCase();

  // Se a própria disciplina possuir classes permitidas definidas
  const filtradasPorConfig = todasDisciplinas.filter(d => {
    const dQualquer = d as any;
    if (dQualquer.classesPermitidas && Array.isArray(dQualquer.classesPermitidas) && dQualquer.classesPermitidas.length > 0) {
      return dQualquer.classesPermitidas.some((c: string) => normalizarNomeClasse(c) === classeNorm);
    }
    return false;
  });

  if (filtradasPorConfig.length > 0) {
    return filtradasPorConfig;
  }

  // Mapeamento padrão pelo sistema de ensino de Angola:
  // 1. Iniciação
  if (classeNorm === 'Iniciação' || classeNorm === 'Iniciacao') {
    return todasDisciplinas.filter(d => 
      d.nivelEnsino === 'Iniciacao' || 
      ['CL', 'MD', 'EMP', 'EM'].includes(d.sigla) ||
      ['Comunicação e Linguagem', 'Matemática e Descoberta', 'Expressão Musical e Plástica', 'Expressão Motora'].some(n => d.nome.toLowerCase().includes(n.toLowerCase()))
    );
  }

  // 2. Ensino Primário (1ª à 6ª Classe)
  const numClasse = parseInt(classeNorm, 10);
  if (!isNaN(numClasse) && numClasse >= 1 && numClasse <= 6) {
    const siglasPrimario = ['LP', 'MAT', 'EM', 'CN', 'HGA', 'EMC', 'EMUS', 'EVP', 'EF'];
    const nomesPrimario = [
      'Língua Portuguesa',
      'Matemática',
      'Estudo do Meio',
      'Ciências da Natureza',
      'História e Geografia de Angola',
      'Educação Moral e Cívica',
      'Educação Musical',
      'Educação Visual e Plástica',
      'Educação Física'
    ];
    return todasDisciplinas.filter(d => 
      d.nivelEnsino === 'Primario' ||
      siglasPrimario.includes(d.sigla) ||
      nomesPrimario.some(n => d.nome.toLowerCase().includes(n.toLowerCase()))
    );
  }

  // 3. Iº Ciclo do Ensino Secundário (7ª, 8ª e 9ª Classes)
  if (!isNaN(numClasse) && numClasse >= 7 && numClasse <= 9) {
    const siglasICiclo = ['LP', 'ING', 'FRA', 'HIST', 'GEO', 'BIO', 'FIS', 'QUI', 'MAT', 'EVP', 'EF', 'EMC', 'EL', 'TIC'];
    const nomesICiclo = [
      'Língua Portuguesa',
      'Língua Inglesa',
      'Língua Francesa',
      'História',
      'Geografia',
      'Biologia',
      'Física',
      'Química',
      'Matemática',
      'Educação Visual e Plástica',
      'Educação Física',
      'Educação Moral e Cívica',
      'Educação Laboral',
      'Informática',
      'TIC'
    ];
    return todasDisciplinas.filter(d => 
      d.nivelEnsino === 'ICiclo' ||
      siglasICiclo.includes(d.sigla) ||
      nomesICiclo.some(n => d.nome.toLowerCase().includes(n.toLowerCase()))
    );
  }

  // 4. IIº Ciclo do Ensino Secundário Geral (PUNIV 10ª, 11ª, 12ª) e Técnico (10ª à 13ª)
  if (!isNaN(numClasse) && numClasse >= 10 && numClasse <= 13) {
    // Disciplinas comuns / formação geral do IIº Ciclo
    const comuns = ['LP', 'ING', 'FRA', 'FIL', 'EF', 'TIC', 'INF', 'MAT'];
    
    // Específicas por curso:
    if (cursoNorm.includes('físicas') || cursoNorm.includes('biológica') || cursoNorm.includes('cfb') || cursoNorm.includes('saúde') || cursoNorm.includes('enfermagem')) {
      return todasDisciplinas.filter(d => 
        (d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico') && 
        (comuns.includes(d.sigla) || ['MAT', 'FIS', 'QUI', 'BIO', 'GEO', 'DES'].includes(d.sigla) ||
         ['Física', 'Química', 'Biologia', 'Geologia', 'Matemática', 'Língua Portuguesa', 'Inglês', 'Filosofia', 'Educação Física'].some(n => d.nome.toLowerCase().includes(n.toLowerCase())))
      );
    }

    if (cursoNorm.includes('económ') || cursoNorm.includes('jurídic') || cursoNorm.includes('cej') || cursoNorm.includes('contabilidade') || cursoNorm.includes('gestão')) {
      return todasDisciplinas.filter(d => 
        (d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico') && 
        (comuns.includes(d.sigla) || ['MAT', 'ECO', 'DIR', 'GEO', 'HIST', 'CONT'].includes(d.sigla) ||
         ['Economia', 'Direito', 'Geografia', 'História', 'Matemática', 'Língua Portuguesa', 'Inglês', 'Filosofia', 'Educação Física'].some(n => d.nome.toLowerCase().includes(n.toLowerCase())))
      );
    }

    if (cursoNorm.includes('humanas') || cursoNorm.includes('letras') || cursoNorm.includes('ciências sociais')) {
      return todasDisciplinas.filter(d => 
        (d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico') && 
        (comuns.includes(d.sigla) || ['HIST', 'GEO', 'LIT', 'PSI', 'SOC', 'LAT'].includes(d.sigla) ||
         ['História', 'Geografia', 'Literatura', 'Psicologia', 'Sociologia', 'Filosofia', 'Língua Portuguesa', 'Inglês', 'Educação Física'].some(n => d.nome.toLowerCase().includes(n.toLowerCase())))
      );
    }

    if (cursoNorm.includes('informát') || cursoNorm.includes('técnico') || cursoNorm.includes('tecnolog') || cursoNorm.includes('eletricidade')) {
      return todasDisciplinas.filter(d => 
        d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico' || d.ehTecnica ||
        ['LP', 'ING', 'MAT', 'FIS', 'QUI', 'TIC', 'INF', 'PROG', 'RED', 'SEI', 'DT', 'OGI', 'PAP'].includes(d.sigla) ||
        ['Programação', 'Redes', 'Sistemas', 'Informática', 'Desenho Técnico', 'Matemática', 'Física', 'Língua Portuguesa', 'Inglês Técnico', 'Educação Física'].some(n => d.nome.toLowerCase().includes(n.toLowerCase()))
      );
    }

    // Default II Ciclo
    const disciplinasIICiclo = todasDisciplinas.filter(d => d.nivelEnsino === 'IICiclo' || d.nivelEnsino === 'EnsinoTecnico');
    return disciplinasIICiclo.length > 0 ? disciplinasIICiclo : todasDisciplinas;
  }

  return todasDisciplinas;
}

export function obterDisciplinasPorClasseECurso(
  todasDisciplinas: Disciplina[],
  classe: string,
  curso?: string
): Disciplina[] {
  const lista = obterDisciplinasBase(todasDisciplinas, classe, curso);
  // Garante que todas as disciplinas seguem rigorosamente a ordenação configurada
  return lista.slice().sort((a, b) => (a.ordem || 99) - (b.ordem || 99));
}

import { downloadElementAsPdf } from './pdfGenerator';

export { downloadElementAsPdf };

/**
 * Utilitários para download de documentos e dados
 */
export function downloadHtmlDocument(filename: string, title: string, htmlContent: string) {
  const fullHtml = `<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 20px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
    th, td { border: 1px solid #111827; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() {
      // Opcional: auto-imprimir se desejado
    };
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadExcelFile(sheetName: string, rows: Record<string, any>[], filename: string) {
  if (!rows || rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

export function downloadJsonFile(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
