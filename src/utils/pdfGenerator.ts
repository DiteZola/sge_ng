import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape';
  unit?: 'mm' | 'pt' | 'px';
  format?: 'a4' | 'letter';
  filename?: string;
  marginMm?: number;
  margins?: Partial<PdfMarginsMm>;
  scale?: number;
}

export interface PdfPageGeometry {
  format: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  pageWidthMm: number;
  pageHeightMm: number;
  margins: PdfMarginsMm;
  printableWidthMm: number;
  printableHeightMm: number;
}

function clampMarginMm(val: number | undefined, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(2, Math.min(35, Math.round(val * 10) / 10));
}

export function resolvePdfPageGeometry(options: PdfExportOptions = {}): PdfPageGeometry {
  const format: 'a4' | 'letter' = options.format === 'letter' ? 'letter' : 'a4';
  const orientation: 'portrait' | 'landscape' = options.orientation === 'landscape' ? 'landscape' : 'portrait';

  const baseW = format === 'letter' ? 215.9 : 210;
  const baseH = format === 'letter' ? 279.4 : 297;

  const pageWidthMm = orientation === 'landscape' ? baseH : baseW;
  const pageHeightMm = orientation === 'landscape' ? baseW : baseH;

  const uniformFallback = clampMarginMm(options.marginMm, 8);
  const margins: PdfMarginsMm = {
    top: clampMarginMm(options.margins?.top, uniformFallback),
    right: clampMarginMm(options.margins?.right, uniformFallback),
    bottom: clampMarginMm(options.margins?.bottom, uniformFallback),
    left: clampMarginMm(options.margins?.left, uniformFallback),
  };

  const printableWidthMm = Math.max(50, pageWidthMm - margins.left - margins.right);
  const printableHeightMm = Math.max(50, pageHeightMm - margins.top - margins.bottom);

  return {
    format,
    orientation,
    pageWidthMm,
    pageHeightMm,
    margins,
    printableWidthMm,
    printableHeightMm,
  };
}

const FIXED_PDF_LAYOUT_CSS = `
  [data-pdf-fixed-header="true"] {
    position: relative !important;
    width: 100% !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  [data-pdf-corner-left="true"] {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    z-index: 20 !important;
  }
  [data-pdf-corner-right="true"] {
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
    z-index: 20 !important;
  }
  [data-pdf-center-insignia="true"] {
    text-align: center !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
  [data-pdf-fixed-student="true"] {
    width: 100% !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  [data-pdf-student-grid="2"] {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-grid="3"] {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-grid="4"] {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-grid="6"] {
    display: grid !important;
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-row="true"] {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
  }
  [data-pdf-fixed-signatures="true"],
  [data-pdf-fixed-qr="true"],
  tr {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
`;

const MODERN_COLOR_FN_RE = /(?:oklch|oklab|lab|lch|color-mix|color)\([^)]*(?:\([^)]*\)[^)]*)*\)/gi;

let colorSamplerCtx: CanvasRenderingContext2D | null = null;
const colorCache = new Map<string, string>();

function getColorSamplerContext(): CanvasRenderingContext2D | null {
  if (colorSamplerCtx) return colorSamplerCtx;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    colorSamplerCtx = c.getContext('2d', { willReadFrequently: true });
    return colorSamplerCtx;
  } catch {
    return null;
  }
}

/**
 * Converte qualquer expressão de cor moderna (oklch, lab, oklab, color-mix, var) para rgba(...)
 * através de rasterização em canvas 1x1 — compatível 100% com html2canvas v1.4.
 */
function normalizeColorForCanvas(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial' || colorStr === 'none') {
    return colorStr;
  }
  const trimmed = colorStr.trim();
  const cached = colorCache.get(trimmed);
  if (cached) return cached;

  try {
    // Primeiro tenta deixar o browser resolver via div temporária (resolve variáveis CSS)
    let resolved = trimmed;
    if (trimmed.includes('var(') || !trimmed.startsWith('rgb')) {
      const probe = document.createElement('div');
      probe.style.position = 'fixed';
      probe.style.left = '-9999px';
      probe.style.color = trimmed;
      document.body.appendChild(probe);
      resolved = window.getComputedStyle(probe).color || trimmed;
      document.body.removeChild(probe);
    }

    // Se ainda contiver oklch/lab/oklab/color-mix/color(, amostra o pixel num canvas 1x1
    if (/(?:oklch|oklab|lab|lch|color-mix|color\()/i.test(resolved)) {
      const ctx = getColorSamplerContext();
      if (ctx) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000000';
        ctx.fillStyle = resolved;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const alpha = Number((data[3] / 255).toFixed(3));
        const rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
        colorCache.set(trimmed, rgba);
        return rgba;
      }
    }

    colorCache.set(trimmed, resolved);
    return resolved;
  } catch {
    return trimmed;
  }
}

/**
 * Substitui expressões oklch/lab/oklab/color-mix dentro de blocos CSS compilados
 */
function sanitizeCssForCanvas(cssText: string): string {
  if (!cssText || !/(?:oklch|oklab|lab|lch|color-mix)/i.test(cssText)) {
    return cssText;
  }
  return cssText.replace(MODERN_COLOR_FN_RE, (match) => {
    const converted = normalizeColorForCanvas(match);
    if (/(?:oklch|oklab|lab|lch|color-mix|color\()/i.test(converted)) {
      return '#1f2937';
    }
    return converted;
  });
}

/**
 * Aguarda carregamento de fontes e imagens presentes no elemento HTML alvo
 */
async function aguardarRecursosProntos(elemento: HTMLElement): Promise<void> {
  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((r) => setTimeout(r, 1200))
      ]);
    }
  } catch {}

  const imagens = Array.from(elemento.querySelectorAll('img'));
  const promises = imagens.map((img) => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 2500);
    });
  });
  await Promise.all(promises);
}

/**
 * Encontra a melhor linha horizontal (em Y) próxima de `idealY` que possua fundo branco/uniforme,
 * evitando cortar texto ou linhas de tabela ao meio nas quebras de página do PDF.
 */
function encontrarMelhorQuebraPaginaY(
  canvas: HTMLCanvasElement,
  idealY: number,
  minY: number
): number {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return idealY;

  const width = canvas.width;
  const maxScanDown = Math.min(canvas.height - 2, idealY + 24);
  const maxScanUp = Math.max(minY + 40, idealY - 120);
  const stepX = Math.max(2, Math.floor(width / 180));

  let melhorY = idealY;
  let melhorPontuacao = -1;

  for (let y = maxScanDown; y >= maxScanUp; y--) {
    try {
      const rowData = ctx.getImageData(0, y, width, 1).data;
      let pixelsBrancosOuUniformes = 0;
      let totalAmostras = 0;

      for (let x = 0; x < width; x += stepX) {
        const idx = x * 4;
        const r = rowData[idx];
        const g = rowData[idx + 1];
        const b = rowData[idx + 2];
        // Quase branco ou fundo neutro claro (espaço entre linhas / margens de células)
        if (r >= 242 && g >= 242 && b >= 242) {
          pixelsBrancosOuUniformes++;
        }
        totalAmostras++;
      }

      const ratio = totalAmostras > 0 ? pixelsBrancosOuUniformes / totalAmostras : 0;
      if (ratio >= 0.995) {
        return y; // Linha perfeitamente limpa encontrada
      }
      if (ratio > melhorPontuacao) {
        melhorPontuacao = ratio;
        melhorY = y;
      }
    } catch {
      return idealY;
    }
  }

  return melhorPontuacao >= 0.88 ? melhorY : idealY;
}

/**
 * Motor Oficial SGE-NG de Exportação PDF (.pdf) com Suporte A4 / Carta, Margens Configuráveis,
 * Posicionamento Fixo da Insígnia & Dados do Aluno, Tabelas, Cores, Assinaturas e Códigos QR.
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

  const cleanFilename = filename.replace(/\.pdf$/i, '').trim() || 'Documento_SGE_MED';
  const scale = options.scale || 2.3;
  const geom = resolvePdfPageGeometry(options);
  const { format, orientation, margins, printableWidthMm, printableHeightMm } = geom;

  await aguardarRecursosProntos(element);

  const originalBackground = element.style.backgroundColor;
  const hadMarker = element.hasAttribute('data-sge-pdf-target');
  const originalWidthPx = element.getBoundingClientRect().width;
  const originalScrollWidth = element.scrollWidth;
  const isThermalReceipt =
    element.id === 'recibo-imprimir-modal' ||
    (originalWidthPx > 0 && originalWidthPx <= 430 && !element.querySelector('table'));

  element.style.backgroundColor = '#ffffff';
  element.setAttribute('data-sge-pdf-target', 'true');

  try {
    const isLandscape = orientation === 'landscape';
    // Largura base proporcional em 96 DPI conforme formato (A4 vs Carta) e orientação
    const baseTargetWidthPx =
      format === 'letter'
        ? (isLandscape ? 1056 : 816)
        : (isLandscape ? 1122 : 794);
    const captureWidthPx = isThermalReceipt
      ? Math.max(320, Math.round(originalWidthPx || 360))
      : Math.max(baseTargetWidthPx, Math.round(originalScrollWidth || baseTargetWidthPx));

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      windowWidth: Math.max(captureWidthPx + 80, isLandscape ? 1280 : 1024),
      onclone: (clonedDoc) => {
        try {
          // 1. Extrair e sanitizar todas as regras CSSOM reais (eliminando oklch/lab do Tailwind v4)
          let compiledCss = '';
          Array.from(document.styleSheets).forEach((sheet) => {
            try {
              const rules = sheet.cssRules || sheet.rules;
              if (rules) {
                for (let i = 0; i < rules.length; i++) {
                  compiledCss += sanitizeCssForCanvas(rules[i].cssText) + '\n';
                }
              }
            } catch {}
          });

          // Remover links/styles crus que possam conter oklch bruto no clone e injetar CSS já sanitizado
          clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
            if (node.tagName === 'STYLE') {
              node.textContent = sanitizeCssForCanvas(node.textContent || '');
            } else {
              node.remove();
            }
          });

          if (compiledCss.trim().length > 0) {
            const fullStyle = clonedDoc.createElement('style');
            fullStyle.setAttribute('data-sge-compiled-styles', 'true');
            fullStyle.textContent = compiledCss;
            clonedDoc.head.appendChild(fullStyle);
          }

          // 2. Estilos normativos de impressão exata + travamento de cabeçalho/insígnia e dados do aluno
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
            .documento-oficial-print {
              background-color: #ffffff !important;
              color: #000000 !important;
              display: block !important;
              visibility: visible !important;
            }
            ${FIXED_PDF_LAYOUT_CSS}
          `;
          clonedDoc.head.appendChild(overrideStyle);

          // 3. Normalizar viewport do documento clonado
          clonedDoc.documentElement.style.width = `${captureWidthPx}px`;
          clonedDoc.documentElement.style.minWidth = `${captureWidthPx}px`;
          clonedDoc.body.style.width = `${captureWidthPx}px`;
          clonedDoc.body.style.minWidth = `${captureWidthPx}px`;
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.body.style.backgroundColor = '#ffffff';

          // 4. Localizar exatamente o elemento marcado antes do clone
          const targetEl = clonedDoc.querySelector('[data-sge-pdf-target="true"]') as HTMLElement | null;
          if (targetEl) {
            targetEl.style.width = `${captureWidthPx}px`;
            targetEl.style.minWidth = `${captureWidthPx}px`;
            targetEl.style.maxWidth = `${captureWidthPx}px`;
            (targetEl.style as any).zoom = '1';
            targetEl.style.transform = 'none';
            targetEl.style.margin = '0 auto';
            targetEl.style.boxSizing = 'border-box';
            targetEl.style.overflow = 'visible';
            targetEl.style.backgroundColor = '#ffffff';
          }

          // Resetar zoom/transform em ancestrais ou filhos
          clonedDoc.querySelectorAll('[style*="zoom"]').forEach((node) => {
            (node as HTMLElement).style.zoom = '1';
          });

          // Garantir que grades de passes (8/folha) e boletins (4/folha) mantêm colunas nítidas
          clonedDoc.querySelectorAll('[data-passes-grid="true"] .grid, .passes-grid-container, .passes-sheet-grid').forEach((pg) => {
            const el = pg as HTMLElement;
            el.style.display = 'grid';
            el.style.gridTemplateColumns = isLandscape ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)';
            el.style.gap = '10px';
            el.style.width = '100%';
          });

          clonedDoc.querySelectorAll('.boletins-grid-4').forEach((bg) => {
            const el = bg as HTMLElement;
            el.style.display = 'grid';
            el.style.gridTemplateColumns = 'repeat(2, 1fr)';
            el.style.gap = '10px';
            el.style.width = '100%';
          });

          // Expandir containers com scroll horizontal para não cortar nenhuma coluna da pauta
          clonedDoc.querySelectorAll('.overflow-x-auto, [class*="overflow-x"], .overflow-y-auto, .max-h-\\[75vh\\]').forEach((w) => {
            const el = w as HTMLElement;
            el.style.overflow = 'visible';
            el.style.maxHeight = 'none';
            el.style.width = '100%';
            el.style.maxWidth = 'none';
          });

          // Garantir dimensões explícitas em SVGs (Insígnia vetorial / ícones)
          clonedDoc.querySelectorAll('svg').forEach((svg) => {
            const rect = svg.getBoundingClientRect();
            if (!svg.getAttribute('width') && rect.width > 0) {
              svg.setAttribute('width', String(Math.round(rect.width)));
            }
            if (!svg.getAttribute('height') && rect.height > 0) {
              svg.setAttribute('height', String(Math.round(rect.height)));
            }
          });

          // Normalizar cores computadas inline no clone
          const colorProps = [
            'color',
            'backgroundColor',
            'borderColor',
            'borderTopColor',
            'borderBottomColor',
            'borderLeftColor',
            'borderRightColor',
            'outlineColor'
          ];
          clonedDoc.querySelectorAll('*').forEach((node) => {
            const el = node as HTMLElement;
            if (!el.style) return;
            try {
              const comp = window.getComputedStyle(el);
              if (!comp) return;
              for (const prop of colorProps) {
                const val = (comp as any)[prop];
                if (val && /(?:oklch|oklab|lab|lch|color-mix|color\()/i.test(val)) {
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

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true
    });

    const canvasTotalHeight = canvas.height;
    const canvasTotalWidth = canvas.width;

    // Recibo térmico estreito: manter proporção elegante centralizada sem esticar
    if (isThermalReceipt) {
      const targetReceiptMm = Math.min(printableWidthMm, 105);
      const receiptHeightMm = (canvasTotalHeight * targetReceiptMm) / canvasTotalWidth;
      const offsetX = margins.left + Math.max(0, (printableWidthMm - targetReceiptMm) / 2);
      const offsetY = margins.top + 2;
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(
        imgData,
        'PNG',
        offsetX,
        offsetY,
        targetReceiptMm,
        Math.min(receiptHeightMm, Math.max(20, printableHeightMm - 4)),
        undefined,
        'FAST'
      );
      pdf.save(`${cleanFilename}.pdf`);
      return true;
    }

    const imgWidthMm = printableWidthMm;
    const totalHeightMm = (canvasTotalHeight * imgWidthMm) / canvasTotalWidth;

    if (totalHeightMm <= printableHeightMm + 2) {
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(
        imgData,
        'PNG',
        margins.left,
        margins.top,
        imgWidthMm,
        Math.min(totalHeightMm, printableHeightMm),
        undefined,
        'FAST'
      );
    } else {
      const maxPageHeightPx = Math.floor((canvasTotalWidth * printableHeightMm) / imgWidthMm);
      let yOffset = 0;
      let pageIndex = 0;

      while (yOffset < canvasTotalHeight - 2) {
        if (pageIndex > 0) {
          pdf.addPage(format, orientation);
        }

        const remaining = canvasTotalHeight - yOffset;
        let sliceHeightPx: number;

        if (remaining <= maxPageHeightPx) {
          sliceHeightPx = remaining;
        } else {
          const idealEnd = yOffset + maxPageHeightPx;
          const smartEnd = encontrarMelhorQuebraPaginaY(canvas, idealEnd, yOffset);
          sliceHeightPx = Math.max(120, Math.min(remaining, smartEnd - yOffset));
        }

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

          const sliceImgData = pageCanvas.toDataURL('image/png');
          const sliceHeightMm = (sliceHeightPx * imgWidthMm) / canvasTotalWidth;
          pdf.addImage(
            sliceImgData,
            'PNG',
            margins.left,
            margins.top,
            imgWidthMm,
            sliceHeightMm,
            undefined,
            'FAST'
          );
        }

        yOffset += sliceHeightPx;
        pageIndex++;
      }
    }

    pdf.save(`${cleanFilename}.pdf`);
    return true;
  } catch (error) {
    console.error('[PDF Generator] Falha na renderização de canvas:', error);
    imprimirElementoDiretamente(element, cleanFilename, options);
    return true;
  } finally {
    element.style.backgroundColor = originalBackground;
    if (!hadMarker) {
      element.removeAttribute('data-sge-pdf-target');
    }
  }
}

/**
 * Impressão direta de alta fidelidade via iframe com preservação de formato (A4/Carta), margens,
 * estilos, tabelas, insígnia e dados do aluno fixos.
 */
export function imprimirElementoDiretamente(
  element: HTMLElement,
  title: string,
  options: PdfExportOptions = {}
): void {
  try {
    const geom = resolvePdfPageGeometry(options);
    const { format, orientation, margins } = geom;

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

    let compiledCss = '';
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let i = 0; i < rules.length; i++) {
            compiledCss += rules[i].cssText + '\n';
          }
        }
      } catch {}
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-AO">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>${compiledCss}</style>
          <style>
            @page {
              size: ${format} ${orientation};
              margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
            }
            body { 
              background: #ffffff !important; 
              color: #000000 !important; 
              padding: 0 !important; 
              margin: 0 !important; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, button { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:flex { display: flex !important; }
            svg { display: inline-block !important; }
            ${FIXED_PDF_LAYOUT_CSS}
          </style>
        </head>
        <body>
          <div style="background: #ffffff; width: 100%;">
            ${element.outerHTML}
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
    }, 450);
  } catch (err) {
    console.error('[PDF Generator] Erro na impressão direta:', err);
    window.print();
  }
}
