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
 * Aguarda o carregamento de todas as imagens presentes num elemento HTML
 */
async function aguardarImagens(elemento: HTMLElement): Promise<void> {
  const imagens = Array.from(elemento.querySelectorAll('img'));
  const promises = imagens.map(img => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Continua mesmo se uma imagem falhar
      setTimeout(resolve, 2000); // Timeout de segurança
    });
  });
  await Promise.all(promises);
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
  const scale = options.scale || 2.4; // 2.4x oferece nitidez de nível de publicação e tamanho de arquivo controlado
  const marginMm = options.marginMm ?? 6;

  // Dimensões oficiais da folha A4 em milímetros
  const a4WidthMm = orientation === 'landscape' ? 297 : 210;
  const a4HeightMm = orientation === 'landscape' ? 210 : 297;
  const printableWidthMm = a4WidthMm - (marginMm * 2);
  const printableHeightMm = a4HeightMm - (marginMm * 2);

  // Aguardar imagens antes da captura
  await aguardarImagens(element);

  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = '#ffffff';

  try {
    const isLandscape = orientation === 'landscape';
    const targetA4WidthPx = isLandscape ? 1122 : 794;

    // Capturar o elemento clonado com html2canvas
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: false, // allowTaint: false é obrigatório para exportar toDataURL sem erro de segurança
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      windowWidth: isLandscape ? 1280 : 1024,
      onclone: (clonedDoc) => {
        try {
          // 1. INJETAR TODAS AS FOLHAS DE ESTILO DO DOCUMENTO PAI NO CLONE
          // Isso garante que classes Tailwind, fontes e regras de impressão sejam aplicadas
          const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
          parentStyles.forEach(styleNode => {
            try {
              clonedDoc.head.appendChild(styleNode.cloneNode(true));
            } catch {}
          });

          // 2. INJETAR ESTILOS CRÍTICOS DE IMPRESSÃO MED ANGOLA
          const overrideStyle = clonedDoc.createElement('style');
          overrideStyle.innerHTML = `
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .no-print, button, input[type="button"], input[type="submit"], nav {
              display: none !important;
            }
            .print\\:block, .print-only {
              display: block !important;
            }
            .print\\:flex {
              display: flex !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border: 1px solid #111827 !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
          `;
          clonedDoc.head.appendChild(overrideStyle);

          // 3. NORMALIZAR LARGURA DO DOCUMENTO CLONADO PARA O FORMATO A4 EXATO
          clonedDoc.documentElement.style.width = `${targetA4WidthPx + 20}px`;
          clonedDoc.documentElement.style.minWidth = `${targetA4WidthPx + 20}px`;
          clonedDoc.body.style.width = `${targetA4WidthPx + 20}px`;
          clonedDoc.body.style.minWidth = `${targetA4WidthPx + 20}px`;
          clonedDoc.body.style.margin = '0 auto';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.body.style.backgroundColor = '#ffffff';

          // 4. RESETAR QUALQUER ZOOM OU TRANSFORM HERDADO DA INTERFACE
          const targetEl = clonedDoc.getElementById(typeof elementOrId === 'string' ? elementOrId : (element.id || 'documento-para-impressao')) ||
                           clonedDoc.getElementById('documento-para-impressao') ||
                           clonedDoc.querySelector('[data-doc-root="true"]') ||
                           clonedDoc.querySelector('.documento-oficial-print');

          if (targetEl) {
            const hEl = targetEl as HTMLElement;
            hEl.style.width = `${targetA4WidthPx}px`;
            hEl.style.minWidth = `${targetA4WidthPx}px`;
            hEl.style.maxWidth = `${targetA4WidthPx}px`;
            (hEl.style as any).zoom = '1';
            hEl.style.transform = 'none';
            hEl.style.margin = '0 auto';
            hEl.style.boxSizing = 'border-box';
            hEl.style.overflow = 'visible';
            hEl.style.borderRadius = '0';
            hEl.style.boxShadow = 'none';
            hEl.style.backgroundColor = '#ffffff';
          }

          // Resetar todos os recipientes com zoom no clone
          const zoomedParents = clonedDoc.querySelectorAll('[style*="zoom"]');
          zoomedParents.forEach(node => {
            (node as HTMLElement).style.zoom = '1';
          });

          // Se for grade de cartões/passes escolares (8 por folha A4)
          const passGrids = clonedDoc.querySelectorAll('[data-passes-grid="true"], .passes-grid-container');
          passGrids.forEach(pg => {
            const el = pg as HTMLElement;
            el.style.display = 'grid';
            el.style.gridTemplateColumns = isLandscape ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)';
            el.style.gap = '8px';
            el.style.width = '100%';
          });

          // Se for grade de boletins (4 por folha A4)
          const boletimGrids = clonedDoc.querySelectorAll('.boletins-grid-4');
          boletimGrids.forEach(bg => {
            const el = bg as HTMLElement;
            el.style.display = 'grid';
            el.style.gridTemplateColumns = 'repeat(2, 1fr)';
            el.style.gap = '10px';
            el.style.width = '100%';
          });

          // Remover scroll horizontal artificial no clone para renderizar 100% das colunas
          const scrollWrappers = clonedDoc.querySelectorAll('.overflow-x-auto, [class*="overflow-x"]');
          scrollWrappers.forEach(w => {
            const el = w as HTMLElement;
            el.style.overflow = 'visible';
            el.style.width = '100%';
            el.style.maxWidth = 'none';
          });

          // Normalizar cores modernas (oklch, color-mix) para compatibilidade com canvas
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
        } catch (cloneErr) {
          console.warn('[PDF Generator] Aviso no ajuste do clone:', cloneErr);
        }
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

    // Se couber numa única página A4
    if (totalHeightMm <= printableHeightMm + 2) {
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, imgWidthMm, Math.min(totalHeightMm, printableHeightMm), undefined, 'FAST');
    } else {
      // Fatiamento preciso página a página em Canvas independente
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
