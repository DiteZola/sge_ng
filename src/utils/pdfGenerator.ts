import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape';
  unit?: 'mm' | 'pt' | 'px';
  format?: 'a4' | 'letter';
  filename?: string;
  marginMm?: number;
  scale?: number;
}

/**
 * Normaliza qualquer cor CSS (incluindo oklch, lab, color-mix do Tailwind v4)
 * para uma representação RGB/HEX compatível com o parser do html2canvas.
 */
function normalizeColorForCanvas(colorStr: string, ctx: CanvasRenderingContext2D | null): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial') {
    return colorStr;
  }
  if (!ctx) return colorStr;
  try {
    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = colorStr;
    return ctx.fillStyle;
  } catch {
    return colorStr;
  }
}

/**
 * Utilitário profissional para gerar e descarregar ficheiros PDF (.pdf) reais
 * com preservação integral de formatação, tabelas, gráficos, carimbos e insígnia nacional.
 */
export async function downloadElementAsPdf(
  elementOrId: HTMLElement | string,
  filename: string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  let element: HTMLElement | null = null;

  if (typeof elementOrId === 'string') {
    element = document.getElementById(elementOrId);
  } else {
    element = elementOrId;
  }

  if (!element) {
    console.error('downloadElementAsPdf: Elemento não encontrado no DOM', elementOrId);
    return false;
  }

  const cleanFilename = filename.replace(/\.pdf$/i, '').trim();
  const orientation = options.orientation || 'portrait';
  const scale = options.scale || 2; // Resolução 2x para nitidez tipográfica
  const margin = options.marginMm ?? 8;

  // Dimensões da folha A4 em milímetros
  const pdfWidth = orientation === 'landscape' ? 297 : 210;
  const pdfHeight = orientation === 'landscape' ? 210 : 297;
  const printableWidth = pdfWidth - (margin * 2);
  const printableHeight = pdfHeight - (margin * 2);

  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = '#ffffff';

  try {
    // Canvas dummy para normalização de cores modernas (oklch, lab, etc.)
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 1;
    dummyCanvas.height = 1;
    const colorCtx = dummyCanvas.getContext('2d');

    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      windowWidth: Math.max(element.scrollWidth, element.offsetWidth, 1024),
      onclone: (clonedDoc) => {
        // 1. Ocultar botões, caixas de pesquisa e controlos de interface (.no-print)
        const noPrintElements = clonedDoc.querySelectorAll(
          '.no-print, button, input[type="button"], input[type="submit"], nav, .action-buttons'
        );
        noPrintElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        // 2. Tornar visíveis elementos específicos de impressão (vistos, carimbos, assinaturas)
        const printElements = clonedDoc.querySelectorAll(
          '.print\\:block, .print\\:flex, .print\\:table-cell, .print-only'
        );
        printElements.forEach(el => {
          (el as HTMLElement).style.display = 'block';
        });

        // 3. Garantir dimensões explícitas para SVGs e Insígnia Nacional da República de Angola
        const svgElements = clonedDoc.querySelectorAll('svg');
        svgElements.forEach(svg => {
          try {
            const widthAttr = svg.getAttribute('width');
            const heightAttr = svg.getAttribute('height');
            const viewBox = svg.getAttribute('viewBox');

            if (!widthAttr) {
              const rect = svg.getBoundingClientRect();
              const w = rect.width > 0 ? rect.width : 56;
              svg.setAttribute('width', String(w));
            }
            if (!heightAttr) {
              const rect = svg.getBoundingClientRect();
              const h = rect.height > 0 ? rect.height : 56;
              svg.setAttribute('height', String(h));
            }
            if (!svg.getAttribute('xmlns')) {
              svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            if (!viewBox) {
              svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width') || 56} ${svg.getAttribute('height') || 56}`);
            }
          } catch (svgErr) {
            console.warn('Ajuste de SVG ignorado:', svgErr);
          }
        });

        // 4. Normalizar cores Tailwind v4 (oklch, color-mix) para evitar falha no parser do html2canvas
        const colorProps = [
          'color', 
          'backgroundColor', 
          'borderColor', 
          'borderTopColor', 
          'borderBottomColor', 
          'borderLeftColor', 
          'borderRightColor'
        ];

        const allClonedElements = clonedDoc.querySelectorAll('*');
        allClonedElements.forEach(node => {
          const el = node as HTMLElement;
          if (!el.style) return;
          try {
            const comp = window.getComputedStyle(el);
            if (!comp) return;

            for (const prop of colorProps) {
              const val = (comp as any)[prop];
              if (val && (val.includes('oklch') || val.includes('color(') || val.includes('lab('))) {
                const norm = normalizeColorForCanvas(val, colorCtx);
                (el.style as any)[prop] = norm;
              }
            }
          } catch {
            // Ignora se não for possível obter estilo computado
          }
        });
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Se couber em uma única página A4
    if (imgHeight <= printableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Documento com múltiplas páginas: fatia suavemente por páginas A4
      let heightLeft = imgHeight;
      let position = margin;
      let page = 1;

      while (heightLeft > 0) {
        if (page > 1) {
          pdf.addPage('a4', orientation);
        }
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= printableHeight;
        position -= printableHeight;
        page++;
      }
    }

    // Grava e descarrega o ficheiro PDF no computador do utilizador
    pdf.save(`${cleanFilename}.pdf`);
    return true;
  } catch (error) {
    console.error('Falha no motor principal de PDF (html2canvas):', error);

    // Motor Secundário: renderizador HTML nativo do jsPDF
    try {
      console.log('Tentando motor secundário de PDF (jsPDF.html)...');
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      await new Promise<void>((resolve, reject) => {
        pdf.html(element, {
          x: margin,
          y: margin,
          width: printableWidth,
          windowWidth: element.offsetWidth || 1024,
          autoPaging: 'text',
          callback: (doc) => {
            doc.save(`${cleanFilename}.pdf`);
            resolve();
          }
        }).catch(reject);
      });

      return true;
    } catch (secError) {
      console.error('Motor secundário também falhou, acionando impressão direta:', secError);
      // Fallback Final: Aciona o diálogo de impressão do navegador (Salvar como PDF)
      imprimirElementoDiretamente(element, cleanFilename);
      return true;
    }
  } finally {
    element.style.backgroundColor = originalBackground;
  }
}

/**
 * Fallback de altíssima fidelidade vetorial que gera impressão direta do documento
 * com preservação de todas as tabelas, bordas, fontes e insígnias.
 */
export function imprimirElementoDiretamente(element: HTMLElement, title: string): void {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Coletar estilos da página atual
    let stylesHtml = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      stylesHtml += el.outerHTML;
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-AO">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          ${stylesHtml}
          <style>
            @page { size: auto; margin: 8mm; }
            body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .no-print { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:flex { display: flex !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #1f2937 !important; padding: 4px 6px !important; }
          </style>
        </head>
        <body>
          <div style="padding: 10px;">
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }
    }, 500);
  } catch (err) {
    console.error('Erro na impressão direta:', err);
    window.print();
  }
}
