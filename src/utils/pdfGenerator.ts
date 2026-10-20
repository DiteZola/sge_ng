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
 * Normaliza qualquer cor CSS para formato seguro HEX/RGB
 */
function normalizeColorForCanvas(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial') {
    return colorStr;
  }
  try {
    const d = document.createElement('div');
    d.style.color = colorStr;
    document.body.appendChild(d);
    const computed = window.getComputedStyle(d).color;
    document.body.removeChild(d);
    return computed || colorStr;
  } catch {
    return colorStr;
  }
}

/**
 * Converte um elemento SVG para imagem Base64 PNG de alta resolução
 */
async function rasterizeSvgToDataUrl(svgEl: SVGElement, width: number, height: number): Promise<string | null> {
  try {
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });

    img.src = blobURL;
    await loadPromise;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(width * 2, 120);
    canvas.height = Math.max(height * 2, 120);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(blobURL);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[PDF Generator] Falha ao rasterizar SVG, mantendo original:', err);
    return null;
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
  const scale = options.scale || 2.5; // Alta definição 2.5x para máxima nitidez das tabelas e texto
  const marginMm = options.marginMm ?? 8;

  // Dimensões da folha A4 em milímetros
  const a4WidthMm = orientation === 'landscape' ? 297 : 210;
  const a4HeightMm = orientation === 'landscape' ? 210 : 297;
  const printableWidthMm = a4WidthMm - (marginMm * 2);
  const printableHeightMm = a4HeightMm - (marginMm * 2);

  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = '#ffffff';

  try {
    // 1. Clonar e rasterizar SVGs complexos antes da captura para evitar erros de gradiente
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: false, // CRÍTICO: allowTaint: false é obrigatório para permitir canvas.toDataURL() sem SecurityError
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      windowWidth: Math.max(element.scrollWidth, element.offsetWidth, 1024),
      onclone: (clonedDoc) => {
        // A. Ocultar botões, barras de ferramentas e controlos de navegação (.no-print)
        const noPrintElements = clonedDoc.querySelectorAll(
          '.no-print, button, input[type="button"], input[type="submit"], nav, .action-buttons'
        );
        noPrintElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        // B. Exibir elementos exclusivos de impressão
        const printElements = clonedDoc.querySelectorAll(
          '.print\\:block, .print\\:flex, .print\\:table-cell, .print-only'
        );
        printElements.forEach(el => {
          (el as HTMLElement).style.display = 'block';
        });

        // C. Garantir estilos explícitos nas tabelas e bordas para formatação perfeita
        const tables = clonedDoc.querySelectorAll('table');
        tables.forEach(table => {
          const t = table as HTMLElement;
          t.style.borderCollapse = 'collapse';
          t.style.width = '100%';
        });

        const tableCells = clonedDoc.querySelectorAll('th, td');
        tableCells.forEach(cell => {
          const c = cell as HTMLElement;
          if (!c.style.borderColor) {
            c.style.borderColor = '#1f2937';
          }
        });

        // D. Normalizar dimensões de SVGs
        const svgElements = clonedDoc.querySelectorAll('svg');
        svgElements.forEach(svg => {
          try {
            if (!svg.getAttribute('xmlns')) {
              svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            const widthAttr = svg.getAttribute('width');
            const heightAttr = svg.getAttribute('height');
            if (!widthAttr) {
              svg.setAttribute('width', '56');
            }
            if (!heightAttr) {
              svg.setAttribute('height', '56');
            }
            if (!svg.getAttribute('viewBox')) {
              svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width') || 56} ${svg.getAttribute('height') || 56}`);
            }
          } catch {}
        });

        // E. Normalizar cores Tailwind modernas (oklch, color-mix) para evitar falhas no html2canvas
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'];
        const allCloned = clonedDoc.querySelectorAll('*');
        allCloned.forEach(node => {
          const el = node as HTMLElement;
          if (!el.style) return;
          try {
            const comp = window.getComputedStyle(el);
            if (!comp) return;
            for (const prop of colorProps) {
              const val = (comp as any)[prop];
              if (val && (val.includes('oklch') || val.includes('color(') || val.includes('lab('))) {
                (el.style as any)[prop] = normalizeColorForCanvas(val);
              }
            }
          } catch {}
        });
      }
    });

    // 2. Criar documento jsPDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgWidthMm = printableWidthMm;
    const canvasTotalHeight = canvas.height;
    const canvasTotalWidth = canvas.width;
    const totalHeightMm = (canvasTotalHeight * imgWidthMm) / canvasTotalWidth;

    // Se couber numa única página
    if (totalHeightMm <= printableHeightMm) {
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, imgWidthMm, totalHeightMm, undefined, 'FAST');
    } else {
      // Fatiamento preciso página a página em Canvas independente para evitar sobreposição ou cortes
      const pageHeightPx = (canvasTotalWidth * printableHeightMm) / imgWidthMm;
      let yOffset = 0;
      let pageIndex = 0;

      while (yOffset < canvasTotalHeight) {
        if (pageIndex > 0) {
          pdf.addPage('a4', orientation);
        }

        const sliceHeightPx = Math.min(pageHeightPx, canvasTotalHeight - yOffset);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasTotalWidth;
        pageCanvas.height = sliceHeightPx;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0,
            yOffset,
            canvasTotalWidth,
            sliceHeightPx,
            0,
            0,
            canvasTotalWidth,
            sliceHeightPx
          );

          const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          const sliceHeightMm = (sliceHeightPx * imgWidthMm) / canvasTotalWidth;
          pdf.addImage(sliceImgData, 'JPEG', marginMm, marginMm, imgWidthMm, sliceHeightMm, undefined, 'FAST');
        }

        yOffset += sliceHeightPx;
        pageIndex++;
      }
    }

    // Gravar e descarregar o PDF oficial
    pdf.save(`${cleanFilename}.pdf`);
    return true;
  } catch (error) {
    console.error('[PDF Generator] Falha na renderização de canvas:', error);
    // Fallback de contingência: Aciona impressão de altíssima fidelidade com estilos preservados
    imprimirElementoDiretamente(element, cleanFilename);
    return true;
  } finally {
    element.style.backgroundColor = originalBackground;
  }
}

/**
 * Impressão direta de alta fidelidade com preservação de todas as tabelas, bordas, cores e insígnias
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
            body { 
              background: #ffffff !important; 
              color: #000000 !important; 
              padding: 0 !important; 
              margin: 0 !important; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; 
            }
            .no-print { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:flex { display: flex !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #1f2937 !important; padding: 4px 6px !important; }
            svg { display: inline-block !important; }
          </style>
        </head>
        <body>
          <div style="padding: 10px; background: #ffffff;">
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
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 500);
  } catch (err) {
    console.error('[PDF Generator] Erro na impressão direta:', err);
    window.print();
  }
}
