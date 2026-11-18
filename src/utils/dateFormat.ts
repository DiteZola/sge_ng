/**
 * Utilitários oficiais de formatação de datas no padrão de Angola (DD/MM/AAAA e extenso).
 * Evita desvios de fuso horário UTC ao converter datas ISO (AAAA-MM-DD).
 */

export const MESES_ANGOLA = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
] as const;

interface ParsedDateParts {
  dia: number;
  mes: number; // 1..12
  ano: number;
  hora?: number;
  minuto?: number;
}

function parseDateParts(valor?: string | Date | null): ParsedDateParts | null {
  if (!valor) return null;

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return {
      dia: valor.getDate(),
      mes: valor.getMonth() + 1,
      ano: valor.getFullYear(),
      hora: valor.getHours(),
      minuto: valor.getMinutes()
    };
  }

  const str = String(valor).trim();
  if (!str) return null;

  // ISO puro YYYY-MM-DD ou YYYY-MM-DDTHH:mm...
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?/);
  if (isoMatch) {
    const ano = parseInt(isoMatch[1], 10);
    const mes = parseInt(isoMatch[2], 10);
    const dia = parseInt(isoMatch[3], 10);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return {
        dia,
        mes,
        ano,
        hora: isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : undefined,
        minuto: isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : undefined
      };
    }
  }

  // Formato angolano DD/MM/AAAA ou DD-MM-AAAA (opcional HH:mm)
  const aoMatch = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:[T\s,]+(\d{1,2}):(\d{1,2}))?/);
  if (aoMatch) {
    const dia = parseInt(aoMatch[1], 10);
    const mes = parseInt(aoMatch[2], 10);
    const ano = parseInt(aoMatch[3], 10);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return {
        dia,
        mes,
        ano,
        hora: aoMatch[4] !== undefined ? parseInt(aoMatch[4], 10) : undefined,
        minuto: aoMatch[5] !== undefined ? parseInt(aoMatch[5], 10) : undefined
      };
    }
  }

  // Tentativa genérica
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      dia: d.getDate(),
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      hora: d.getHours(),
      minuto: d.getMinutes()
    };
  }

  return null;
}

/**
 * Formata uma data no padrão oficial angolano:
 * - 'curto': DD/MM/AAAA (ex.: 14/05/2008)
 * - 'extenso': DD de Mês de AAAA (ex.: 14 de Maio de 2008)
 */
export function formatarDataAngolana(
  valor?: string | Date | null,
  estilo: 'curto' | 'extenso' = 'curto',
  fallback = '—'
): string {
  const parts = parseDateParts(valor);
  if (!parts) {
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
    return fallback;
  }

  const dd = String(parts.dia).padStart(2, '0');
  const mm = String(parts.mes).padStart(2, '0');

  if (estilo === 'extenso') {
    const nomeMes = MESES_ANGOLA[parts.mes - 1] || mm;
    return `${dd} de ${nomeMes} de ${parts.ano}`;
  }

  return `${dd}/${mm}/${parts.ano}`;
}

/**
 * Formata data e hora no padrão oficial angolano: DD/MM/AAAA às HH:mm
 */
export function formatarDataHoraAngolana(
  valor?: string | Date | null,
  fallback = '—'
): string {
  const parts = parseDateParts(valor);
  if (!parts) {
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
    return fallback;
  }

  const dataCurta = `${String(parts.dia).padStart(2, '0')}/${String(parts.mes).padStart(2, '0')}/${parts.ano}`;
  if (parts.hora !== undefined && parts.minuto !== undefined) {
    const hh = String(parts.hora).padStart(2, '0');
    const min = String(parts.minuto).padStart(2, '0');
    return `${dataCurta} às ${hh}:${min}`;
  }

  return dataCurta;
}

/**
 * Retorna a data actual formatada no padrão angolano.
 */
export function hojeAngolano(estilo: 'curto' | 'extenso' = 'extenso'): string {
  return formatarDataAngolana(new Date(), estilo);
}
