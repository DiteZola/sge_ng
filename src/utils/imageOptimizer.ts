/**
 * Utilitário de Otimização e Compressão de Imagens
 * Evita estouro de limite de 1MB do Firestore e melhora a velocidade da aplicação.
 */
export async function comprimirImagemBase64(
  dataUrl: string, 
  maxDim: number = 380, 
  qualidade: number = 0.80
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return dataUrl || '';
  }

  // Se não for Data URL de imagem, retornar como está
  if (!dataUrl.startsWith('data:image/') && !dataUrl.startsWith('data:application/')) {
    return dataUrl;
  }

  // Se for SVG puro e compacto (< 200KB), manter vetor original
  if (dataUrl.startsWith('data:image/svg+xml') && dataUrl.length < 200000) {
    return dataUrl;
  }

  // Se já for suficientemente pequeno (< 90KB) e não for BMP pesado
  if (dataUrl.length < 90000 && !dataUrl.startsWith('data:image/bmp')) {
    return dataUrl;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      // Não definir crossOrigin para data: URIs para evitar restrições em browsers
      let finalizado = false;

      const timer = setTimeout(() => {
        if (!finalizado) {
          finalizado = true;
          resolve(dataUrl);
        }
      }, 1500);

      img.onload = () => {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(timer);

        try {
          let { width, height } = img;
          if (width <= 0 || height <= 0) {
            resolve(dataUrl);
            return;
          }

          // Redimensionamento proporcional para caber em maxDim x maxDim
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Limpar canvas preservando canal alfa / transparência
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Tentar exportar em WebP com transparência
          let result = canvas.toDataURL('image/webp', qualidade);

          // Se o navegador não suportar WebP ou se o resultado não for WebP
          if (!result || !result.startsWith('data:image/webp')) {
            result = canvas.toDataURL('image/png');
          }

          // Se ainda assim for maior do que 400KB em PNG, exportar em JPEG
          if (result && result.length > 400000) {
            const canvasJpg = document.createElement('canvas');
            canvasJpg.width = width;
            canvasJpg.height = height;
            const ctxJpg = canvasJpg.getContext('2d');
            if (ctxJpg) {
              ctxJpg.fillStyle = '#ffffff';
              ctxJpg.fillRect(0, 0, width, height);
              ctxJpg.drawImage(img, 0, 0, width, height);
              const jpgResult = canvasJpg.toDataURL('image/jpeg', 0.75);
              if (jpgResult && jpgResult.length < result.length) {
                result = jpgResult;
              }
            }
          }

          // Devolve a versão otimizada se for menor
          if (result && result.length < dataUrl.length) {
            console.log(`[ImageOptimizer] Imagem comprimida com sucesso de ${(dataUrl.length / 1024).toFixed(1)}KB para ${(result.length / 1024).toFixed(1)}KB`);
            resolve(result);
          } else {
            resolve(dataUrl);
          }
        } catch (canvasErr) {
          console.warn('[ImageOptimizer] Erro ao renderizar no canvas:', canvasErr);
          resolve(dataUrl);
        }
      };

      img.onerror = (err) => {
        if (!finalizado) {
          finalizado = true;
          clearTimeout(timer);
          console.warn('[ImageOptimizer] Falha ao carregar imagem para compressão:', err);
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    } catch (e) {
      console.warn('[ImageOptimizer] Exceção geral:', e);
      resolve(dataUrl);
    }
  });
}
