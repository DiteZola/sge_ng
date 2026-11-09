import React from 'react';

export interface StrictNumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (val: string) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Filtra qualquer caractere não numérico colado
 */
export function sanitizeStrictNumeric(text: string, allowDecimal = false): string {
  if (!text) return '';
  if (!allowDecimal) {
    return text.replace(/[^\d]/g, '');
  }
  // Permitir dígitos e no máximo um ponto ou vírgula
  const limpo = text.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const partes = limpo.split('.');
  if (partes.length <= 1) return limpo;
  return `${partes[0]}.${partes.slice(1).join('')}`;
}

/**
 * Handler de teclado rigoroso: bloqueia letras e símbolos na raiz
 */
export function handleStrictNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>, allowDecimal = false) {
  // Teclas de controle permitidas
  const teclasPermitidas = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
  ];

  if (teclasPermitidas.includes(e.key)) return;

  // Permitir atalhos de sistema (Ctrl/Cmd + A, C, V, X, Z)
  if (e.ctrlKey || e.metaKey) return;

  // Se permitir decimal (ponto ou vírgula)
  if (allowDecimal && (e.key === '.' || e.key === ',')) {
    const target = e.currentTarget;
    if (target.value.includes('.') || target.value.includes(',')) {
      e.preventDefault();
    }
    return;
  }

  // Apenas dígitos 0 a 9
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Handler de colar rigoroso: impede colagem de texto ou limpa para somente números
 */
export function handleStrictNumericPaste(
  e: React.ClipboardEvent<HTMLInputElement>, 
  onCleanVal?: (val: string) => void,
  allowDecimal = false
) {
  e.preventDefault();
  const rawText = e.clipboardData.getData('text');
  const limpo = sanitizeStrictNumeric(rawText, allowDecimal);
  if (!limpo) return;

  const target = e.currentTarget;
  const start = target.selectionStart || 0;
  const end = target.selectionEnd || 0;
  const valAtual = target.value;
  const novoValor = valAtual.substring(0, start) + limpo + valAtual.substring(end);

  if (onCleanVal) {
    onCleanVal(novoValor);
  } else {
    target.value = novoValor;
    const evt = new Event('input', { bubbles: true });
    target.dispatchEvent(evt);
  }
}

export const StrictNumericInput: React.FC<StrictNumericInputProps> = ({
  value,
  onChange,
  allowDecimal = false,
  min,
  max,
  className = '',
  ...rest
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const limpo = sanitizeStrictNumeric(raw, allowDecimal);
    
    if (limpo === '') {
      onChange('');
      return;
    }

    if (max !== undefined || min !== undefined) {
      const num = Number(limpo);
      if (!isNaN(num)) {
        if (max !== undefined && num > max) {
          onChange(String(max));
          return;
        }
        if (min !== undefined && num < min) {
          onChange(String(min));
          return;
        }
      }
    }

    onChange(limpo);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      pattern={allowDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
      autoComplete="off"
      value={value !== undefined && value !== null ? value : ''}
      onKeyDown={(e) => handleStrictNumericKeyDown(e, allowDecimal)}
      onPaste={(e) => handleStrictNumericPaste(e, onChange, allowDecimal)}
      onChange={handleChange}
      className={className}
      {...rest}
    />
  );
};
