import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Aluno, Escola, Turma } from '../types';

export type QrDocumentType =
  | 'PASS'
  | 'CERT'
  | 'DECL'
  | 'BOL'
  | 'PAUTA'
  | 'TERMO'
  | 'HIST'
  | 'REC'
  | 'FICHA'
  | 'COMPR'
  | 'ASSID'
  | 'ATA'
  | 'RECIBO_PAGAMENTO'
  | 'RECIBO_TESOURARIA'
  | 'TERMO_EXAME'
  | 'ATA_JURI'
  | 'BOLETIM_OFICIAL'
  | 'PAUTA_OFICIAL'
  | 'DECLARACAO_NOTAS'
  | 'CERTIFICADO_CICLO'
  | 'FICHA_FUNCIONARIO'
  | 'FICHA_PRESENCAS'
  | 'RELATORIO_OFICIAL'
  | 'LISTA_NOMINAL'
  | 'COMPROVATIVO_MATRICULA';

export interface ParsedQrResult {
  validFormat: boolean;
  checksumValid: boolean;
  type: string;
  escolaId?: string;
  alunoId?: string;
  codigoMatricula?: string;
  numeroProcesso?: string;
  numeroBI?: string;
  docRef?: string;
  rawText: string;
  matchedAluno?: Aluno;
}

/**
 * Calcula checksum curto FNV-1a (6 hex chars) para verificação de autenticidade de QR Codes SGE-NG
 */
export function calcularAssinaturaQr(base: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0).toString(16)).padStart(8, '0').slice(0, 6).toUpperCase();
}

/**
 * Limpa delimitadores para manter payload QR compacto e de leitura rápida por câmaras móveis
 */
function sanitizeQrField(val?: string | number | null): string {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[\|\r\n]/g, ' ').trim();
}

/**
 * Gera payload oficial verificável para Cartão / Passe do Estudante
 */
export function gerarPayloadQrEstudante(
  aluno: Pick<Aluno, 'id' | 'codigoMatricula' | 'numeroProcesso' | 'numeroBI' | 'escolaId' | 'classeId'>,
  escola?: Pick<Escola, 'id' | 'sigla' | 'anoLectivoActivo'> | null,
  turma?: Pick<Turma, 'id' | 'nome' | 'classe' | 'anoLectivo'> | null
): string {
  const escId = sanitizeQrField(escola?.id || aluno.escolaId || 'MED');
  const alId = sanitizeQrField(aluno.id);
  const mat = sanitizeQrField(aluno.codigoMatricula || aluno.numeroProcesso || alId);
  const proc = sanitizeQrField(aluno.numeroProcesso || mat);
  const bi = sanitizeQrField(aluno.numeroBI || '');
  const cl = sanitizeQrField(turma?.classe || aluno.classeId || '');
  const tur = sanitizeQrField(turma?.nome || '');
  const ano = sanitizeQrField(turma?.anoLectivo || escola?.anoLectivoActivo || '');
  const core = `SGE1|PASS|${escId}|${alId}|${mat}|${proc}|${bi}|${cl}|${tur}|${ano}`;
  const sig = calcularAssinaturaQr(core);
  return `${core}|${sig}`;
}

/**
 * Gera payload oficial verificável para Certificados, Declarações, Boletins, Pautas, Termos, Recibos e Fichas
 */
export function gerarPayloadQrDocumento(params: {
  docType: QrDocumentType;
  escolaId: string;
  docRef: string;
  alunoId?: string;
  alunoNome?: string;
  codigoMatricula?: string;
  turmaId?: string;
  anoLectivo?: string;
}): string {
  const core = [
    'SGE1',
    sanitizeQrField(params.docType),
    sanitizeQrField(params.escolaId),
    sanitizeQrField(params.docRef),
    sanitizeQrField(params.alunoId || ''),
    sanitizeQrField(params.codigoMatricula || ''),
    sanitizeQrField(params.turmaId || ''),
    sanitizeQrField(params.anoLectivo || '')
  ].join('|');
  const sig = calcularAssinaturaQr(core);
  return `${core}|${sig}`;
}

/**
 * Interpreta o texto decodificado de um QR Code (SGE1|..., JSON ou código de matrícula/BI/processo)
 * e faz correspondência automática com a lista de alunos da instituição.
 */
export function parseStudentQrPayload(rawInput: string, alunos: Aluno[]): ParsedQrResult {
  const rawText = (rawInput || '').trim();
  if (!rawText) {
    return { validFormat: false, checksumValid: false, type: 'UNKNOWN', rawText };
  }

  const normalizar = (s?: string) => (s || '').trim().toUpperCase().replace(/\s+/g, '');

  // Formato oficial SGE1|TYPE|escolaId|...
  if (rawText.startsWith('SGE1|')) {
    const parts = rawText.split('|');
    const type = parts[1] || 'PASS';
    const sigRecebida = parts[parts.length - 1] || '';
    const core = parts.slice(0, -1).join('|');
    const checksumValid = sigRecebida.toUpperCase() === calcularAssinaturaQr(core);

    if (type === 'PASS' && parts.length >= 6) {
      const escolaId = parts[2];
      const alunoId = parts[3];
      const codigoMatricula = parts[4];
      const numeroProcesso = parts[5];
      const numeroBI = parts[6];

      const matchedAluno = alunos.find(a =>
        a.id === alunoId ||
        (codigoMatricula && normalizar(a.codigoMatricula) === normalizar(codigoMatricula)) ||
        (numeroProcesso && normalizar(a.numeroProcesso) === normalizar(numeroProcesso)) ||
        (numeroBI && normalizar(a.numeroBI) === normalizar(numeroBI))
      );

      return {
        validFormat: true,
        checksumValid,
        type,
        escolaId,
        alunoId,
        codigoMatricula,
        numeroProcesso,
        numeroBI,
        rawText,
        matchedAluno
      };
    }

    // Documento oficial (CERT, DECL, BOL, REC, COMPR, etc.)
    const escolaId = parts[2];
    const docRef = parts[3];
    const alunoId = parts[4];
    const codigoMatricula = parts[5];
    const matchedAluno = alunos.find(a =>
      (alunoId && a.id === alunoId) ||
      (codigoMatricula && normalizar(a.codigoMatricula) === normalizar(codigoMatricula)) ||
      (docRef && normalizar(a.codigoMatricula) === normalizar(docRef))
    );

    return {
      validFormat: true,
      checksumValid,
      type,
      escolaId,
      docRef,
      alunoId,
      codigoMatricula,
      rawText,
      matchedAluno
    };
  }

  // Fallback para leitura direta de texto simples (matrícula, processo, BI ou ID)
  const norm = normalizar(rawText);
  const matchedAluno = alunos.find(a =>
    a.id === rawText ||
    normalizar(a.codigoMatricula) === norm ||
    normalizar(a.numeroProcesso) === norm ||
    normalizar(a.numeroBI) === norm ||
    normalizar(a.numeroDocumento) === norm
  );

  return {
    validFormat: Boolean(matchedAluno),
    checksumValid: false,
    type: 'PLAIN',
    rawText,
    matchedAluno
  };
}

// Cache em memória de DataURLs já gerados para renderização instantânea e compatibilidade PDF
const qrDataUrlCache = new Map<string, string>();

export async function gerarQrCodeDataUrl(value: string, width = 180): Promise<string> {
  const safeVal = (value || 'SGE-NG-MED').trim();
  const cacheKey = `${width}::${safeVal}`;
  const cached = qrDataUrlCache.get(cacheKey);
  if (cached) return cached;

  const dataUrl = await QRCode.toDataURL(safeVal, {
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
  if (qrDataUrlCache.size > 600) {
    qrDataUrlCache.clear();
  }
  qrDataUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}

export interface OfficialQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  label?: string;
}

/**
 * Componente oficial de QR Code renderizado como <img> PNG Base64 de alta resolução.
 * Garante 100% de compatibilidade com html2canvas, geração PDF, HTML offline e impressoras térmicas/laser.
 */
export const OfficialQrCode: React.FC<OfficialQrCodeProps> = ({
  value,
  size = 64,
  className = '',
  alt = 'Código QR de Autenticação Oficial MED',
  label
}) => {
  const safeValue = (value || 'SGE-NG-MED').trim();
  const renderPx = Math.max(160, size * 3);
  const cacheKey = `${renderPx}::${safeValue}`;
  const [dataUrl, setDataUrl] = useState<string>(() => qrDataUrlCache.get(cacheKey) || '');

  useEffect(() => {
    let mounted = true;
    const cached = qrDataUrlCache.get(cacheKey);
    if (cached) {
      setDataUrl(cached);
      return;
    }
    gerarQrCodeDataUrl(safeValue, renderPx)
      .then((url) => {
        if (mounted) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [cacheKey, safeValue, renderPx]);

  return (
    <div className="inline-flex flex-col items-center justify-center">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={alt}
          width={size}
          height={size}
          style={{ width: size, height: size, minWidth: size, minHeight: size }}
          className={`block bg-white border border-gray-300 p-0.5 rounded-xs object-contain ${className}`}
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className={`bg-white border border-gray-300 flex items-center justify-center text-[7px] font-mono text-gray-400 rounded-xs ${className}`}
        >
          QR
        </div>
      )}
      {label && (
        <span className="text-[7px] font-bold text-gray-600 mt-0.5 text-center leading-none">
          {label}
        </span>
      )}
    </div>
  );
};
