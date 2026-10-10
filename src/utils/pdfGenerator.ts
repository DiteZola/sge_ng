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
 * Utilitário profissional para gerar e descarregar ficheiros PDF (.pdf) reais
 * a partir de nós HTML do DOM, compatível com iframes e sandboxing.
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
  const scale = options.scale || 2; // Alta resolução (2x) para nitidez tipográfica

  // Adicionar classe temporária ou garantir fundo branco
  const originalBackground = element.style.backgroundColor;
  element.style.backgroundColor = '#ffffff';

  try {
    // Captura com html2canvas com alta definição e preservação integral de SVGs e insígnias
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // 1. Remover elementos marcados como no-print do clone
        const noPrintElements = clonedDoc.querySelectorAll('.no-print, button, input[type="button"]');
        noPrintElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        // 2. Garantir que vistos e carimbos com classes de impressão fiquem visíveis no clone
        const printElements = clonedDoc.querySelectorAll('.print\\:block, .print\\:flex');
        printElements.forEach(el => {
          (el as HTMLElement).style.display = 'block';
        });

        // 3. Converter SVGs em Imagens Base64 para garantir que a Insígnia Nacional da República de Angola
        // e outros vetores heráldicos sejam gravados com 100% de precisão e sem perda de gradientes
        const svgElements = clonedDoc.querySelectorAll('svg');
        svgElements.forEach(svg => {
          try {
            const svgRect = svg.getBoundingClientRect();
            const width = svgRect.width || parseInt(svg.getAttribute('width') || '56') || 56;
            const height = svgRect.height || parseInt(svg.getAttribute('height') || '56') || 56;
            
            // Garantir namespace e atributos de dimensão explícitos
            if (!svg.getAttribute('xmlns')) {
              svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            svg.setAttribute('width', String(width));
            svg.setAttribute('height', String(height));

            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svg);
            const svgEncoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

            const img = clonedDoc.createElement('img');
            img.src = svgEncoded;
            img.width = width;
            img.height = height;
            img.style.width = `${width}px`;
            img.style.height = `${height}px`;
            img.style.display = 'inline-block';
            img.style.verticalAlign = 'middle';
            img.className = svg.getAttribute('class') || '';
            img.alt = svg.getAttribute('aria-label') || 'Insígnia Oficial';

            svg.parentNode?.replaceChild(img, svg);
          } catch (e) {
            console.warn('Conversão de SVG para imagem ignorada:', e);
          }
        });
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Dimensões A4 em milímetros
    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;
    const margin = options.marginMm ?? 8;

    const printableWidth = pdfWidth - (margin * 2);
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Se o conteúdo couber em uma única página A4
    if (imgHeight <= (pdfHeight - (margin * 2))) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Conteúdo multipágina: divide verticalmente de forma suave
      let heightLeft = imgHeight;
      let position = margin;
      let page = 1;

      while (heightLeft > 0) {
        if (page > 1) {
          pdf.addPage('a4', orientation);
        }
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - (margin * 2));
        position -= (pdfHeight - (margin * 2));
        page++;
      }
    }

    // Grava e descarrega o ficheiro PDF no computador do utilizador
    pdf.save(`${cleanFilename}.pdf`);
    return true;
  } catch (error) {
    console.error('Erro ao gerar documento PDF:', error);
    
    // Fallback: se houver restrição gráfica pontual, cria um PDF com texto formatado
    try {
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });
      pdf.setFontSize(14);
      pdf.text(cleanFilename, 14, 20);
      pdf.setFontSize(10);
      const textLines = element.innerText.split('\n').filter(l => l.trim().length > 0);
      let y = 30;
      for (const line of textLines) {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line.substring(0, 95), 14, y);
        y += 6;
      }
      pdf.save(`${cleanFilename}.pdf`);
      return true;
    } catch (fallbackError) {
      console.error('Fallback PDF também falhou:', fallbackError);
      return false;
    }
  } finally {
    element.style.backgroundColor = originalBackground;
  }
}
