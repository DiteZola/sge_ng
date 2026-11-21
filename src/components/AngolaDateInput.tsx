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
export function validarDataAngolana(dataStr: string, minYear = 1900, maxYear = 2099): { valida: boolean; erro?: string } {
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
  minYear = 1900,
  maxYear = 2099,
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

  // Manipulador de digitação manual fluida com suporte a dígitos corridos, barras, traços, backspace e colar
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Se o utilizador estiver colando ou digitando formato ISO (AAAA-MM-DD)
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(raw.trim())) {
      const isoNorm = raw.trim().replace(/\//g, '-');
      const ao = formatarParaDataAngola(isoNorm);
      setTextoManual(ao);
      const val = validarDataAngolana(ao, minYear, maxYear);
      if (val.valida) {
        setErroValidacao(null);
        onChange(isoNorm);
      } else {
        setErroValidacao(val.erro || 'Data inválida');
      }
      return;
    }

    // Permitir separadores '-' convertendo para '/'
    raw = raw.replace(/-/g, '/').replace(/[^\d/]/g, '');

    const aumentando = raw.length > textoManual.length;
    if (aumentando) {
      // Se o utilizador digitou/colou vários dígitos sem barras (ex.: 14051998)
      const semBarras = raw.replace(/\//g, '');
      if (!raw.includes('/') && semBarras.length >= 3) {
        const d = semBarras.slice(0, 2);
        const m = semBarras.slice(2, 4);
        const a = semBarras.slice(4, 8);
        raw = a.length > 0 ? `${d}/${m}/${a}` : `${d}/${m}`;
      } else if ((raw.length === 2 || raw.length === 5) && !raw.endsWith('/')) {
        raw = raw + '/';
      }
    }

    if (raw.length > 10) {
      raw = raw.substring(0, 10);
    }

    setTextoManual(raw);

    // Aceita data completa mesmo se dia/mês tiverem 1 ou 2 dígitos (ex: 5/3/2010 ou 05/03/2010)
    const matchCompleta = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchCompleta) {
      const normalizada = `${matchCompleta[1].padStart(2, '0')}/${matchCompleta[2].padStart(2, '0')}/${matchCompleta[3]}`;
      const val = validarDataAngolana(normalizada, minYear, maxYear);
      if (val.valida) {
        setErroValidacao(null);
        const iso = formatarAngolaParaIso(normalizada);
        onChange(iso);
      } else {
        setErroValidacao(val.erro || 'Data inválida');
      }
    } else if (raw.length === 0) {
      setErroValidacao(required ? 'Campo obrigatório' : null);
      onChange('');
    } else {
      setErroValidacao(null);
    }
  };

  const handleBlur = () => {
    const trimmed = textoManual.trim();
    if (trimmed.length > 0) {
      // Auto-completar zeros caso tenha digitado 5/3/2010
      const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const candidato = m
        ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`
        : trimmed;
      const val = validarDataAngolana(candidato, minYear, maxYear);
      if (!val.valida) {
        setErroValidacao(val.erro || 'Data inválida no formato de Angola (DD/MM/AAAA)');
      } else {
        if (candidato !== textoManual) setTextoManual(candidato);
        setErroValidacao(null);
        onChange(formatarAngolaParaIso(candidato));
      }
    } else if (required) {
      setErroValidacao('Por favor, indique uma data válida.');
    }
  };

  // Seletor nativo rápido como suporte alternativo através do ícone
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
        <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1 text-xs">
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
          inputMode="numeric"
          autoComplete="off"
          className={`w-full p-2 pr-9 text-xs font-mono font-bold rounded-lg border transition-colors focus:outline-none cursor-text ${
            erroValidacao
              ? 'border-2 border-red-700 dark:border-red-500 bg-red-100/70 dark:bg-red-950/50 text-red-950 dark:text-red-200 ring-2 ring-red-500 focus:border-red-800'
              : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
          }`}
        />

        {/* Botão de abrir datepicker nativo integrado estritamente restrito ao ícone do calendário */}
        <div 
          className="absolute right-1 top-1 bottom-1 w-7 flex items-center justify-center cursor-pointer text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Escolher data no calendário"
        >
          <Calendar className="w-4 h-4 pointer-events-none" />
          <input
            type="date"
            disabled={disabled}
            tabIndex={-1}
            value={formatarAngolaParaIso(textoManual)}
            onChange={handleNativePickerChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ fontSize: '10px' }}
          />
        </div>
      </div>

      {erroValidacao && (
        <div className="flex items-center space-x-1 text-[11px] text-red-900 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 p-1.5 rounded font-bold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-700 dark:text-red-400" />
          <span>{erroValidacao}</span>
        </div>
      )}
    </div>
  );
};
