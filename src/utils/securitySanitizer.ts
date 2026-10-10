import { useState, useEffect } from 'react';

/**
 * ========================================================
 * SGE-NG Angola - Sanitização e Validações de Segurança
 * Protege contra injeções (XSS, SQLi, Buffer Bombs),
 * ataques de negação de serviço por expressões regulares (ReDoS)
 * e congelamento/derrubação do sistema via caixas de pesquisa e seleção.
 * ========================================================
 */

// Padrões de risco conhecidos (scripts, injeções, tokens de ataque)
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // onerror=, onclick=, onload=
  /\b(union\s+select|drop\s+table|delete\s+from|insert\s+into)\b/gi,
  /\x00|\x08|\x0B|\x0C|\x0E|\x1F/g // Caracteres de controle de baixo nível
];

/**
 * Sanitiza texto de caixa de pesquisa ou formulário.
 * Remove caracteres maliciosos, sequências de injeção e impõe comprimento máximo estrito.
 */
export function sanitizeSearchInput(input: string | undefined | null, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input;

  // 1. Remover caracteres perigosos e injeções
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // 2. Remover tags HTML básicas
  sanitized = sanitized.replace(/<[^>]*>?/gm, '');

  // 3. Limitar comprimento máximo para evitar ataques de estouro de buffer (Buffer Bombing)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}

/**
 * Normaliza texto para busca rápida e segura:
 * Remove acentuação e transforma em caixa baixa de modo seguro.
 */
export function normalizeTextSafe(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';
  try {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  } catch {
    return text.toLowerCase().trim();
  }
}

/**
 * Realiza comparação de pesquisa rápida, imune a ReDoS (Catastrophic Backtracking)
 * e sem alocação desnecessária de expressões regulares.
 */
export function safeSearchMatch(itemText: string | undefined | null, searchTerm: string): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;
  if (!itemText) return false;

  const cleanQuery = sanitizeSearchInput(searchTerm, 100);
  if (!cleanQuery) return true;

  const normalizedQuery = normalizeTextSafe(cleanQuery);
  const normalizedItem = normalizeTextSafe(itemText);

  return normalizedItem.includes(normalizedQuery);
}

/**
 * Validação rigorosa de entradas de texto em formulários.
 */
export function validateFormTextInput(
  value: string | undefined | null, 
  fieldName: string, 
  maxLength: number = 150, 
  required: boolean = false
): { isValid: boolean; sanitized: string; error?: string } {
  if (!value || !value.trim()) {
    if (required) {
      return { isValid: false, sanitized: '', error: `O campo "${fieldName}" é de preenchimento obrigatório.` };
    }
    return { isValid: true, sanitized: '' };
  }

  const sanitized = sanitizeSearchInput(value, maxLength);

  if (value.length > maxLength) {
    return {
      isValid: false,
      sanitized,
      error: `O campo "${fieldName}" não pode exceder ${maxLength} caracteres (foram fornecidos ${value.length}).`
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Valida se um valor selecionado em dropdown/select pertence estritamente ao conjunto de opções permitidas.
 * Previne adulteração de dados ou valores corrompidos.
 */
export function validateSelectOption<T extends string>(
  selected: string | undefined | null, 
  allowedOptions: readonly T[] | T[], 
  fallback: T
): T {
  if (!selected) return fallback;
  const match = allowedOptions.find(opt => opt === selected);
  return match || fallback;
}

/**
 * Hook de debounce para caixas de pesquisa:
 * Evita repetições massivas de renderização ou travamentos de tela durante digitação rápida.
 */
export function useDebouncedSearch(value: string, delayMs: number = 220): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
