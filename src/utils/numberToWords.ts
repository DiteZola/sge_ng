/**
 * Utilitário oficial de conversão de notas numéricas para extenso
 * em conformidade com as normas de escrituração escolar do MED de Angola.
 */

const NOTAS_EXTENSO: Record<number, string> = {
  0: 'Zero',
  1: 'Um',
  2: 'Dois',
  3: 'Três',
  4: 'Quatro',
  5: 'Cinco',
  6: 'Seis',
  7: 'Sete',
  8: 'Oito',
  9: 'Nove',
  10: 'Dez',
  11: 'Onze',
  12: 'Doze',
  13: 'Treze',
  14: 'Catorze',
  15: 'Quinze',
  16: 'Dezasseis',
  17: 'Dezassete',
  18: 'Dezoito',
  19: 'Dezanove',
  20: 'Vinte'
};

/**
 * Converte uma nota numeral para extenso entre parênteses com a palavra Valores.
 * Exemplo: 12 -> "(Doze) Valores"
 * Exemplo: 10 -> "(Dez) Valores"
 */
export function converterNotaParaExtenso(nota: number | string | undefined | null): string {
  if (nota === undefined || nota === null || nota === '-' || nota === '') {
    return '== ==== ======';
  }

  const num = typeof nota === 'number' ? nota : parseFloat(String(nota).replace(',', '.'));
  if (isNaN(num)) return '== ==== ======';

  // Se for inteiro exato
  const inteiro = Math.round(num);
  if (Math.abs(num - inteiro) < 0.05) {
    const nome = NOTAS_EXTENSO[inteiro] || String(inteiro);
    return `(${nome}) Valores`;
  }

  // Se tiver casas decimais (ex: 13.1)
  const parteInteira = Math.floor(num);
  const parteDecimal = Math.round((num - parteInteira) * 10);
  const nomeInteiro = NOTAS_EXTENSO[parteInteira] || String(parteInteira);
  const nomeDecimal = NOTAS_EXTENSO[parteDecimal] || String(parteDecimal);

  return `${nomeInteiro} vírgula ${nomeDecimal.toLowerCase()} valores`;
}

/**
 * Retorna o texto por extenso direto para a coluna do Certificado (ex: "Onze valores", "Quinze valores")
 */
export function converterNotaParaCertificadoExtenso(nota: number | string | undefined | null): string {
  if (nota === undefined || nota === null || nota === '-' || nota === '') {
    return '== ==== ======';
  }

  const num = typeof nota === 'number' ? nota : parseFloat(String(nota).replace(',', '.'));
  if (isNaN(num)) return '== ==== ======';

  const inteiro = Math.round(num);
  const nome = NOTAS_EXTENSO[inteiro] || String(inteiro);
  return `${nome} valores`;
}

// Aliases para máxima compatibilidade com componentes oficiais MED
export const converterNotaParaExtensoMED = (nota: number | string | undefined | null): string => {
  const ext = converterNotaParaExtenso(nota);
  // remove parênteses externos se existirem para flexibilidade de formatação
  return ext.replace(/^\(/, '').replace(/\) Valores$/, '').trim();
};

export const numeroParaExtenso = (num: number): string => {
  return NOTAS_EXTENSO[Math.round(num)] || String(num);
};
