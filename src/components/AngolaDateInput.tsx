import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

interface AngolaDateInputProps {
  value: string; // Pode ser formato ISO (YYYY-MM-DD) ou formato angolano (DD/MM/AAAA)
  onChange: (valueIsoOuAo: string) => void;
  label?: string;
  required?: boolean;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}

/**
 * Converte data de ISO (YYYY-MM-DD) para formato de Angola (DD/MM/AAAA)
 */
export function formatarParaDataAngola(dataIsoOuStr?: string): string {
  if (!dataIsoOuStr) return '';
  const str = dataIsoOuStr.trim();
  if (str.includes('/')) return str; // Já está formatado em DD/MM/AAAA
  if (str.includes('-')) {
    const partes = str.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
      return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
    }
  }
  return str;
}

/**
 * Converte formato de Angola (DD/MM/AAAA) para ISO (YYYY-MM-DD)
 */
export function formatarAngolaParaIso(dataAo?: string): string {
  if (!dataAo) return '';
  const str = dataAo.trim();
  if (str.includes('-') && str.split('-')[0].length === 4) return str;
  if (str.includes('/')) {
    const partes = str.split('/');
    if (partes.length === 3) {
      const dia = partes[0].padStart(2, '0');
      const mes = partes[1].padStart(2, '0');
      const ano = partes[2];
      if (ano.length === 4) {
        return `${ano}-${mes}-${dia}`;
      }
    }
  }
  return str;
}

/**
 * Validação rigorosa de datas no formato normal de Angola (DD/MM/AAAA)
 */
export function validarDataAngolana(dataStr: string, minYear = 1920, maxYear = 2050): { valida: boolean; erro?: string } {
  if (!dataStr || dataStr.trim() === '') {
    return { valida: false, erro: 'Data não informada' };
  }

  // Aceita formatos com barra ou traço: DD/MM/AAAA ou DD-MM-AAAA
  const clean = dataStr.trim().replace(/-/g, '/');
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = clean.match(regex);

  if (!match) {
    return { valida: false, erro: 'Formato inválido. Use o padrão de Angola: DD/MM/AAAA' };
  }

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const ano = parseInt(match[3], 10);

  if (ano < minYear || ano > maxYear) {
    return { valida: false, erro: `Ano fora do intervalo permitido (${minYear} a ${maxYear})` };
  }

  if (mes < 1 || mes > 12) {
    return { valida: false, erro: 'Mês inválido (deve ser entre 01 e 12)' };
  }

  // Dias por mês considerando anos bissextos
  const diasPorMes = [31, (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDias = diasPorMes[mes - 1];

  if (dia < 1 || dia > maxDias) {
    return { valida: false, erro: `Dia inválido para o mês ${mes} (máximo de ${maxDias} dias)` };
  }

  return { valida: true };
}

export const AngolaDateInput: React.FC<AngolaDateInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  minYear = 1920,
  maxYear = 2050,
  placeholder = 'DD/MM/AAAA',
  className = '',
  disabled = false,
  name,
  id
}) => {
  const [textoManual, setTextoManual] = useState<string>(() => formatarParaDataAngola(value));
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Sincronizar quando o valor externo mudar
  useEffect(() => {
    const formatted = formatarParaDataAngola(value);
    if (formatted !== textoManual) {
      setTextoManual(formatted);
      if (formatted) {
        const val = validarDataAngolana(formatted, minYear, maxYear);
        setErroValidacao(val.valida ? null : val.erro || null);
      } else {
        setErroValidacao(null);
      }
    }
  }, [value, minYear, maxYear]);

  // Manipulador de digitação com máscara amigável
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d/]/g, '');

    // Formatação progressiva com barras (DD/MM/AAAA)
    if (raw.length === 2 && !raw.includes('/') && !textoManual.endsWith('/')) {
      raw = raw + '/';
    } else if (raw.length === 5 && raw.split('/').length === 2 && !textoManual.endsWith('/')) {
      raw = raw + '/';
    }

    if (raw.length > 10) {
      raw = raw.substring(0, 10);
    }

    setTextoManual(raw);

    if (raw.length === 10) {
      const val = validarDataAngolana(raw, minYear, maxYear);
      if (val.valida) {
        setErroValidacao(null);
        const iso = formatarAngolaParaIso(raw);
        onChange(iso);
      } else {
        setErroValidacao(val.erro || 'Data inválida');
      }
    } else if (raw.length === 0) {
      setErroValidacao(required ? 'Campo obrigatório' : null);
      onChange('');
    } else {
      // Incompleto
      setErroValidacao(null);
    }
  };

  const handleBlur = () => {
    if (textoManual.trim().length > 0) {
      const val = validarDataAngolana(textoManual, minYear, maxYear);
      if (!val.valida) {
        setErroValidacao(val.erro || 'Data inválida no formato de Angola');
      } else {
        setErroValidacao(null);
        onChange(formatarAngolaParaIso(textoManual));
      }
    } else if (required) {
      setErroValidacao('Por favor, indique uma data válida.');
    }
  };

  // Seletor nativo rápido como suporte alternativo
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const aoVal = formatarParaDataAngola(isoVal);
      setTextoManual(aoVal);
      setErroValidacao(null);
      onChange(isoVal);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="font-semibold text-gray-700 block mb-1 text-xs">
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          value={textoManual}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full p-2 pr-10 text-xs font-mono font-bold rounded-lg border transition-colors focus:outline-none ${
            erroValidacao
              ? 'border-2 border-red-700 bg-red-100/70 text-red-950 ring-2 ring-red-500 focus:border-red-800'
              : 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
          }`}
        />

        {/* Botão de abrir datepicker nativo integrado */}
        <label 
          className="absolute right-2 cursor-pointer text-gray-400 hover:text-blue-600 transition-colors p-1"
          title="Escolher data no calendário"
        >
          <Calendar className="w-4 h-4" />
          <input
            type="date"
            disabled={disabled}
            value={formatarAngolaParaIso(textoManual)}
            onChange={handleNativePickerChange}
            className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto w-full h-full"
          />
        </label>
      </div>

      {erroValidacao && (
        <div className="flex items-center space-x-1 text-[11px] text-red-900 bg-red-50 border border-red-300 p-1.5 rounded font-bold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-700" />
          <span>{erroValidacao}</span>
        </div>
      )}
    </div>
  );
};
