/**
 * Utilitário de Processamento e Compressão Inteligente de Fotografias
 * Permite fotos de até 10 MB do dispositivo (câmera/galeria) com compressão
 * em alta fidelidade para armazenamento otimizado e descompressão nítida para impressão/PDF.
 */

export interface ImageProcessingResult {
  sucesso: boolean;
  dataUrl?: string;
  erro?: string;
  tamanhoOriginalBytes?: number;
  tamanhoComprimidoBytes?: number;
  largura?: number;
  altura?: number;
}

const LIMITE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Processa e comprime uma fotografia de estudante ou funcionário mantendo proporção e alta nitidez
 */
export async function processarFotoUpload(
  file: File,
  maxDimensao = 1200,
  qualidade = 0.90
): Promise<ImageProcessingResult> {
  if (!file) {
    return { sucesso: false, erro: 'Nenhum ficheiro selecionado.' };
  }

  // Validação de tipo MIME
  if (!file.type.startsWith('image/')) {
    return { sucesso: false, erro: 'O ficheiro selecionado não é uma imagem válida (PNG, JPG, JPEG, WEBP).' };
  }

  // Validação de limite estrito de 10 MB
  if (file.size > LIMITE_MAX_BYTES) {
    const tamanhoMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      sucesso: false,
      erro: `A imagem selecionada possui ${tamanhoMb} MB, excedendo o limite máximo permitido de 10 MB.`
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({ sucesso: false, erro: 'Falha ao ler o ficheiro no dispositivo.' });
    };

    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src !== 'string') {
        resolve({ sucesso: false, erro: 'Erro na conversão de imagem.' });
        return;
      }

      const img = new Image();
      img.onerror = () => {
        resolve({ sucesso: false, erro: 'Não foi possível decodificar a imagem.' });
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Se a imagem for maior que a dimensão máxima (1200px), redimensionar mantendo proporção
          if (width > maxDimensao || height > maxDimensao) {
            if (width > height) {
              height = Math.round((height * maxDimensao) / width);
              width = maxDimensao;
            } else {
              width = Math.round((width * maxDimensao) / height);
              height = maxDimensao;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 100);
          canvas.height = Math.max(height, 100);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback para imagem original se canvas não estiver disponível
            resolve({
              sucesso: true,
              dataUrl: src,
              tamanhoOriginalBytes: file.size,
              tamanhoComprimidoBytes: file.size,
              largura: img.width,
              altura: img.height
            });
            return;
          }

          // Ativar interpolação bicúbica de alta qualidade
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fundo branco para garantir transparência tratada como fundo neutro
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Exportar em JPEG de alta qualidade (ou PNG se original for PNG pequeno)
          const outputFormat = file.type === 'image/png' && file.size < 500 * 1024 ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputFormat, qualidade);

          const comprimidoAproxBytes = Math.round((dataUrl.length * 3) / 4);

          resolve({
            sucesso: true,
            dataUrl,
            tamanhoOriginalBytes: file.size,
            tamanhoComprimidoBytes: comprimidoAproxBytes,
            largura: canvas.width,
            altura: canvas.height
          });
        } catch (err: any) {
          console.warn('[ImageCompressor] Falha no canvas, usando imagem direta:', err);
          resolve({
            sucesso: true,
            dataUrl: src,
            tamanhoOriginalBytes: file.size,
            tamanhoComprimidoBytes: file.size,
            largura: img.width,
            altura: img.height
          });
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
